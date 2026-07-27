/**
 * End-to-end check of the AI layer against the real database.
 *
 * Exercises the actual pipeline functions the app uses — not a reimplementation
 * — then removes everything it created. Run with:
 *   npx tsx --env-file=.env.local e2e-check.ts
 */
import { createClient } from "@supabase/supabase-js";
import { ingestDocument } from "./src/lib/ai/ingest";
import { retrieve, streamAnswer } from "./src/lib/ai/answer";
import { PLANS } from "./src/lib/plans";
import type { Bot } from "./src/lib/types";

const KNOWLEDGE = `
Tatiana Beauty Studio — services and prices, 2026.

Balayage starts at $180 for shoulder-length hair and $220 for longer hair.
The price includes a toner and a blow-dry. Allow about three hours.

A cut and blow-dry is $60. A root touch-up is $90. A treatment and gloss is $45.

Opening hours: Tuesday to Friday 10:00-20:00, Saturday 09:00-18:00.
We are closed on Sunday and Monday.

Booking: appointments only, no walk-ins. Colour services over $200 require a
30% deposit. Cancellations need 24 hours notice or the deposit is kept.
`;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

let botId: string | null = null;

try {
  const { data: account } = await admin
    .from("accounts")
    .select("id, email")
    .order("created_at", { ascending: true })
    .limit(1)
    .single<{ id: string; email: string }>();

  if (!account) throw new Error("No account found — sign up in the app first.");
  console.log(`account: ${account.email}\n`);

  const { data: bot } = await admin
    .from("bots")
    .insert({
      account_id: account.id,
      name: "E2E Check (temporary)",
      greeting: "Hi!",
    })
    .select("*")
    .single<Bot>();

  if (!bot) throw new Error("Could not create the temporary bot.");
  botId = bot.id;

  // --- ingestion -----------------------------------------------------------
  console.log("1. Ingesting a document…");
  const started = Date.now();
  const { chunks } = await ingestDocument(
    admin,
    bot.id,
    { text: KNOWLEDGE, kind: "text", title: "Prices & hours.txt" },
    "Prices & hours.txt",
  );
  console.log(`   ok — ${chunks} chunk(s) embedded and stored in ${Date.now() - started}ms\n`);

  // --- retrieval + answering ----------------------------------------------
  const cases: { question: string; expectAnswer: boolean; note: string }[] = [
    { question: "How much is balayage on long hair?", expectAnswer: true, note: "should say $220" },
    { question: "Are you open on Sundays?", expectAnswer: true, note: "should say closed" },
    { question: "Do you do hair extensions?", expectAnswer: false, note: "not in the document" },
  ];

  let failures = 0;

  for (const testCase of cases) {
    console.log(`2. "${testCase.question}"  (${testCase.note})`);

    const matches = await retrieve(admin, bot.id, testCase.question);
    console.log(
      `   retrieved ${matches.length} passage(s)` +
        (matches.length ? ` — top similarity ${matches[0].similarity.toFixed(3)}` : ""),
    );

    const answerStarted = Date.now();
    let firstDeltaAt = 0;

    const result = await streamAnswer({
      bot,
      model: PLANS.free.model,
      matches,
      history: [],
      question: testCase.question,
      leadCapture: false,
      onDelta: () => {
        if (!firstDeltaAt) firstDeltaAt = Date.now() - answerStarted;
      },
    });

    console.log(`   first token ${firstDeltaAt}ms, total ${Date.now() - answerStarted}ms`);
    console.log(`   answer: "${result.text}"`);
    console.log(`   sources: [${result.sources.join(", ")}]  unanswered: ${result.unanswered}`);

    const answered = !result.unanswered;
    if (answered !== testCase.expectAnswer) {
      failures++;
      console.log(
        `   MISMATCH — expected ${testCase.expectAnswer ? "an answer" : "a refusal"}\n`,
      );
    } else if (result.text.includes("[[")) {
      failures++;
      console.log("   MISMATCH — the sentinel marker leaked into the visible answer\n");
    } else {
      console.log("   ok\n");
    }
  }

  console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
} finally {
  if (botId) {
    // Cascades to documents, chunks and conversations.
    await admin.from("bots").delete().eq("id", botId);
    console.log("\n(temporary bot removed)");
  }
}
