import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "./embed";
import { geminiPost, geminiUrl } from "./gemini";
import type { Bot, ChunkMatch } from "@/lib/types";

/**
 * Emitted by the model on its own line when the knowledge base didn't cover the
 * question. Stripped before the answer reaches the user; drives the "unanswered"
 * flag and the lead-capture prompt.
 */
const NO_ANSWER = "[[NO_ANSWER]]";

/**
 * Cosine-similarity floor for retrieved passages.
 *
 * Calibrated by measurement, not guesswork. Gemini's scores sit high and in a
 * narrow band: a passage that directly answers the question measures ~0.78-0.84,
 * an unrelated one ~0.60. A tighter floor looks safer but is actively harmful —
 * at 0.70 a real question about opening hours scored 0.638 and got refused even
 * though the answer was sitting in the retrieved text.
 *
 * So retrieval is permissive and the prompt is the real guard. A marginal
 * passage costs a few tokens; a wrongly dropped one costs a visitor being told
 * "I don't know" about something the business plainly documented. Verified: with
 * a 0.68 near-miss passage in context, the model still refuses correctly.
 *
 * `e2e-check.mts` re-measures all of this against the live pipeline.
 */
const MIN_SIMILARITY = 0.6;

const MAX_CHUNKS = 6;

export type Turn = { role: "user" | "assistant"; content: string };

export type AnswerResult = {
  text: string;
  sources: string[];
  unanswered: boolean;
};

/** Retrieve the passages most relevant to the question. */
export async function retrieve(
  supabase: SupabaseClient,
  botId: string,
  question: string,
): Promise<ChunkMatch[]> {
  const embedding = await embedQuery(question);

  const { data, error } = await supabase.rpc("match_chunks", {
    p_bot_id: botId,
    p_embedding: JSON.stringify(embedding),
    p_limit: MAX_CHUNKS,
  });

  if (error) throw new Error(error.message);

  return ((data ?? []) as ChunkMatch[]).filter((m) => m.similarity >= MIN_SIMILARITY);
}

function buildSystemPrompt(bot: Bot, matches: ChunkMatch[], leadCapture: boolean) {
  const context = matches.length
    ? matches
        .map(
          (m, i) =>
            `<source index="${i + 1}" document="${m.document_title}">\n${m.content}\n</source>`,
        )
        .join("\n\n")
    : "(No relevant passages were found in the knowledge base.)";

  const fallback = leadCapture
    ? "say you don't have that detail on hand and offer to pass the question to the team — the interface will collect their email"
    : "say you don't have that detail on hand and suggest they contact the business directly";

  return `You are the front-desk assistant for ${bot.name}. You answer questions from visitors on the company's website.

Answer using ONLY the knowledge base passages below. They are the company's own material — treat them as the single source of truth.

<knowledge_base>
${context}
</knowledge_base>

Rules:
- If the passages don't contain the answer, ${fallback}. Never guess, and never fill a gap from general knowledge. Prices, opening hours, availability and policies must come from the passages verbatim or not at all.
- When you cannot answer from the passages, end your reply with ${NO_ANSWER} on its own final line. Include this marker only in that case — never when you did answer.
- Keep replies to two or three sentences. Visitors are reading this in a small chat window on their phone.
- Reply in the same language the visitor wrote in.
- Write as the business ("we", "our"), never as a third party describing it.
- Don't mention the passages, the knowledge base, documents, or that you are an AI unless asked directly.
- Respond only with your final answer. Do not include exploratory reasoning, options you considered and rejected, or commentary about your process.
${bot.instructions.trim() ? `\nAdditional instructions from the business owner:\n${bot.instructions.trim()}` : ""}`;
}

/**
 * Stream an answer. `onDelta` receives text as it arrives; the promise resolves
 * with the full answer plus the metadata worth persisting.
 */
export async function streamAnswer(opts: {
  bot: Bot;
  model: string;
  matches: ChunkMatch[];
  history: Turn[];
  question: string;
  leadCapture: boolean;
  onDelta: (text: string) => void;
}): Promise<AnswerResult> {
  const { bot, model, matches, history, question, leadCapture, onDelta } = opts;

  const response = await geminiPost(
    geminiUrl(model, "streamGenerateContent", "?alt=sse"),
    {
      systemInstruction: { parts: [{ text: buildSystemPrompt(bot, matches, leadCapture) }] },
      contents: [
        // Gemini names the assistant role "model".
        ...history.map((turn) => ({
          role: turn.role === "assistant" ? "model" : "user",
          parts: [{ text: turn.content }],
        })),
        { role: "user", parts: [{ text: question }] },
      ],
      generationConfig: {
        // Front-desk answers are two or three sentences, but the budget is
        // shared with the model's internal reasoning, so it can't be tight.
        maxOutputTokens: 2048,
        temperature: 0.2,
        // A chat widget is latency-sensitive and the task is extractive, not
        // analytical. Minimal reasoning keeps first-token time near a second.
        thinkingConfig: { thinkingLevel: "minimal" },
      },
    },
  );

  let raw = "";
  // The marker can be split across deltas, so hold back a tail long enough to
  // contain it rather than leaking a partial "[[NO_ANS" to the user.
  let flushed = 0;

  for await (const chunk of readGeminiStream(response)) {
    raw += chunk;

    const safeUpTo = Math.max(flushed, raw.length - NO_ANSWER.length);
    if (safeUpTo > flushed) {
      onDelta(raw.slice(flushed, safeUpTo));
      flushed = safeUpTo;
    }
  }

  const unanswered = raw.includes(NO_ANSWER) || matches.length === 0;
  const clean = raw.replaceAll(NO_ANSWER, "");

  // Emit the held-back tail, now that the marker has been stripped from it.
  if (clean.length > flushed) onDelta(clean.slice(flushed));

  const text = clean.trim();

  const sources = unanswered
    ? []
    : [...new Set(matches.map((m) => m.document_title))].slice(0, 3);

  return { text, sources, unanswered };
}

type GeminiFrame = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
};

/**
 * Yield the text of a Gemini SSE stream.
 *
 * Two details that bite: frames are separated by CRLF blank lines, and a frame
 * can carry several parts of which some are the model's own reasoning, marked
 * `thought`. Reading only the first part returns empty answers.
 */
async function* readGeminiStream(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The AI service sent no response body.");

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;

      let payload: GeminiFrame;
      try {
        payload = JSON.parse(line.slice(5)) as GeminiFrame;
      } catch {
        continue; // partial or keep-alive frame
      }

      for (const part of payload.candidates?.[0]?.content?.parts ?? []) {
        if (part.thought || typeof part.text !== "string" || !part.text) continue;
        yield part.text;
      }
    }
  }
}
