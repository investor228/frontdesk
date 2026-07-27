import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runChatTurn } from "@/lib/ai/chat-pipeline";
import { sseResponse } from "@/lib/sse";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { CORS_HEADERS, isAllowedOrigin } from "@/lib/widget-access";
import { planOf } from "@/lib/plans";
import type { Bot } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Public chat endpoint used by the embedded widget. There is no session here —
 * the bot's public key identifies the tenant, and every downstream query is
 * pinned to the bot id resolved from it.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    publicKey?: string;
    message?: string;
    conversationId?: string | null;
  } | null;

  const message = body?.message?.trim();
  if (!body?.publicKey || !message) {
    return NextResponse.json(
      { error: "Missing publicKey or message." },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  if (message.length > 2000) {
    return NextResponse.json(
      { error: "That message is too long." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const limit = rateLimit(`widget:${body.publicKey}:${clientIp(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many messages. Give it a moment." },
      {
        status: 429,
        headers: { ...CORS_HEADERS, "retry-after": String(limit.retryAfter) },
      },
    );
  }

  const admin = createAdminClient();

  const { data: bot } = await admin
    .from("bots")
    .select("*")
    .eq("public_key", body.publicKey)
    .maybeSingle<Bot>();

  if (!bot) {
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

  const { data: account } = await admin
    .from("accounts")
    .select("id, plan")
    .eq("id", bot.account_id)
    .single<{ id: string; plan: string }>();

  if (!account) {
    return NextResponse.json(
      { error: "Unknown assistant." },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  return sseResponse(
    (send) =>
      runChatTurn({
        supabase: admin,
        bot,
        accountId: account.id,
        plan: planOf(account.plan),
        channel: "widget",
        conversationId: body.conversationId ?? null,
        message,
        send,
      }),
    CORS_HEADERS,
  );
}
