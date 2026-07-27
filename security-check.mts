/**
 * Proves the SECURITY DEFINER functions are not reachable by end users.
 *
 * Uses the anon key — the one that ships inside the browser bundle, so every
 * visitor already has it — and tries to call the privileged functions directly,
 * the way an attacker would. Before migration 0002 both calls succeed. After
 * it, both must be denied while the app itself keeps working.
 *
 *   npx tsx --env-file=.env.local security-check.mts
 */
import { createClient } from "@supabase/supabase-js";

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// A tenant to target. An attacker would obtain a bot id some other way — from a
// dashboard URL, a screenshot, a shared link; the service role is used here only
// so the test has a valid one to aim at.
type TargetBot = { id: string; name: string; account_id: string };

let bot: TargetBot | null = null;
let createdBot = false;

const { data: existing } = await admin
  .from("bots")
  .select("id, name, account_id")
  .limit(1)
  .maybeSingle<TargetBot>();

if (existing) {
  bot = existing;
} else {
  // Nothing to target yet — stand up a throwaway tenant with one secret in it.
  const { data: account } = await admin
    .from("accounts")
    .select("id")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!account) {
    console.log("No accounts exist yet — sign up in the app, then rerun.");
    process.exit(0);
  }

  const { data: created } = await admin
    .from("bots")
    .insert({ account_id: account.id, name: "Security Check (temporary)" })
    .select("id, name, account_id")
    .single<TargetBot>();

  if (!created) throw new Error("Could not create the temporary bot.");

  const { data: doc } = await admin
    .from("documents")
    .insert({
      bot_id: created.id,
      title: "Confidential prices.txt",
      source: "Confidential prices.txt",
      kind: "text",
      status: "ready",
      char_count: 80,
    })
    .select("id")
    .single<{ id: string }>();

  await admin.from("chunks").insert({
    document_id: doc!.id,
    bot_id: created.id,
    content:
      "CONFIDENTIAL: our wholesale cost per balayage is $42 and the staff bonus is 15%.",
    embedding: JSON.stringify(Array(1536).fill(0.01)),
  });

  bot = created;
  createdBot = true;
}

console.log(`target: bot "${bot.name}"\n`);

let leaks = 0;

// --- 1. can a stranger read this tenant's knowledge base? -------------------
const { data: chunks, error: chunksError } = await anon.rpc("match_chunks", {
  p_bot_id: bot.id,
  p_embedding: JSON.stringify(Array(1536).fill(0.01)),
  p_limit: 100,
});

if (chunksError) {
  console.log(`match_chunks         DENIED   (${chunksError.code ?? "error"})`);
} else {
  leaks++;
  const rows = (chunks ?? []) as { content: string }[];
  console.log(`match_chunks         LEAKED   ${rows.length} passage(s) readable`);
  if (rows[0]) console.log(`  e.g. "${rows[0].content.slice(0, 90)}…"`);
}

// --- 2. can a stranger burn this tenant's monthly allowance? ----------------
const { data: quota, error: quotaError } = await anon.rpc("try_consume_message", {
  p_account_id: bot.account_id,
  p_limit: 999999,
});

if (quotaError) {
  console.log(`try_consume_message  DENIED   (${quotaError.code ?? "error"})`);
} else {
  leaks++;
  console.log(`try_consume_message  ABUSED   quota incremented: ${JSON.stringify(quota)}`);
}

// --- 3. plain table reads must already be blocked by row-level security -----
const { data: rows, error: tableError } = await anon.from("chunks").select("content").limit(5);
const blocked = Boolean(tableError) || (rows ?? []).length === 0;
console.log(`direct table read    ${blocked ? "DENIED   (row-level security)" : "LEAKED"}`);
if (!blocked) leaks++;

if (createdBot) {
  await admin.from("bots").delete().eq("id", bot.id);
  console.log("\n(temporary bot removed)");
}

console.log(
  leaks === 0
    ? "\nSECURE — the anon key cannot reach any tenant data."
    : `\nVULNERABLE — ${leaks} path(s) exposed. Apply supabase/migrations/0002_lock_down_rpcs.sql.`,
);
process.exitCode = leaks === 0 ? 0 : 1;
