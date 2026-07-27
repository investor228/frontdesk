import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { CORS_HEADERS, isAllowedOrigin } from "@/lib/widget-access";
import { planOf } from "@/lib/plans";
import type { Bot } from "@/lib/types";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Capture a visitor's contact details after the bot couldn't answer. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    publicKey?: string;
    email?: string;
    name?: string | null;
    question?: string | null;
    conversationId?: string | null;
  } | null;

  const email = body?.email?.trim().toLowerCase();

  if (!body?.publicKey || !email || !EMAIL.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const limit = rateLimit(`lead:${body.publicKey}:${clientIp(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Try again shortly." },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  const admin = createAdminClient();

  const { data: bot } = await admin
    .from("bots")
    .select("*")
    .eq("public_key", body.publicKey)
    .maybeSingle<Bot>();

  if (!bot || !bot.lead_capture) {
    return NextResponse.json(
      { error: "Unknown assistant." },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  if (!isAllowedOrigin(bot, request.headers.get("origin"))) {
    return NextResponse.json(
      { error: "This assistant is not enabled for this domain." },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  // Lead capture is a paid feature; re-check the live plan, not the bot flag,
  // in case the account downgraded after enabling it.
  const { data: account } = await admin
    .from("accounts")
    .select("plan")
    .eq("id", bot.account_id)
    .single<{ plan: string }>();

  if (!account || !planOf(account.plan).features.leadCapture) {
    return NextResponse.json(
      { error: "Lead capture is not enabled." },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  const { error } = await admin.from("leads").insert({
    bot_id: bot.id,
    conversation_id: body.conversationId ?? null,
    name: body.name?.trim().slice(0, 120) || null,
    email,
    question: body.question?.trim().slice(0, 1000) || null,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not save that. Try again." },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
