/**
 * Dress rehearsal for the video.
 *
 * Pushes the real demo PDF through the real pipeline and asks the exact
 * questions from DEMO-SCRIPT.md, so nothing is discovered for the first time
 * while recording. Cleans up after itself.
 *
 *   npx tsx --env-file=.env.local demo-assets/rehearse.mts
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { extractFile } from "../src/lib/ai/extract";
import { ingestDocument } from "../src/lib/ai/ingest";
import { retrieve, streamAnswer } from "../src/lib/ai/answer";
import { PLANS } from "../src/lib/plans";
import type { Bot } from "../src/lib/types";

const PDF = new URL("./Tatiana-Beauty-Studio-Price-List-2026.pdf", import.meta.url);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

let botId: string | null = null;

try {
  const { data: account } = await admin
    .from("accounts")
    .select("id")
    .limit(1)
    .single<{ id: string }>();
  if (!account) throw new Error("Sign up in the app first.");

  const { data: bot } = await admin
    .from("bots")
    .insert({ account_id: account.id, name: "Tatiana Beauty Studio" })
    .select("*")
    .single<Bot>();
  if (!bot) throw new Error("Could not create the rehearsal bot.");
  botId = bot.id;

  // --- the exact upload a viewer will watch --------------------------------
  const buffer = await readFile(PDF);
  const file = new File([new Uint8Array(buffer)], "Tatiana-Beauty-Studio-Price-List-2026.pdf", {
    type: "application/pdf",
  });

  const extracted = await extractFile(file);
  console.log(`extracted ${extracted.text.length} characters of text from the PDF`);

  const { chunks } = await ingestDocument(admin, bot.id, extracted, file.name);
  console.log(`indexed into ${chunks} chunk(s)\n`);

  // --- the exact questions from the script ---------------------------------
  const script: { q: string; expectAnswer: boolean; want?: string }[] = [
    { q: "How much is balayage for long hair?", expectAnswer: true, want: "220" },
    { q: "Are you open on Sundays?", expectAnswer: true, want: "closed" },
    { q: "Do I need to pay a deposit?", expectAnswer: true, want: "30" },
    { q: "Do you do hair extensions?", expectAnswer: false },
    { q: "Can I get a manicure with you?", expectAnswer: false },
  ];

  let problems = 0;

  for (const line of script) {
    const matches = await retrieve(admin, bot.id, line.q);
    const result = await streamAnswer({
      bot,
      model: PLANS.free.model,
      matches,
      history: [],
      question: line.q,
      leadCapture: false,
      onDelta: () => {},
    });

    const answered = !result.unanswered;
    const ok =
      answered === line.expectAnswer &&
      (!line.want || result.text.toLowerCase().includes(line.want.toLowerCase()));

    console.log(`${ok ? "ok  " : "FAIL"}  "${line.q}"`);
    console.log(`      ${result.text}`);
    if (matches.length) {
      console.log(`      top similarity ${matches[0].similarity.toFixed(3)}`);
    }
    console.log(
      `      ${answered ? `sources: ${result.sources.join(", ")}` : "refused (no sources)"}\n`,
    );

    if (!ok) problems++;
  }

  console.log(
    problems === 0
      ? "REHEARSAL PASSED — every scripted question behaves as written."
      : `${problems} scripted question(s) did not behave as written.`,
  );
  process.exitCode = problems === 0 ? 0 : 1;
} finally {
  if (botId) {
    await admin.from("bots").delete().eq("id", botId);
    console.log("\n(rehearsal bot removed)");
  }
}
