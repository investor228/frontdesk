import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { runChatTurn } from "@/lib/ai/chat-pipeline";
import { sseResponse } from "@/lib/sse";
import type { Bot } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** In-app playground. Authenticated; the bot is scoped by RLS. */
export async function POST(request: Request) {
  const { userId, plan } = await requireSession();
  const supabase = await createClient();

  const body = (await request.json()) as {
    botId?: string;
    message?: string;
    conversationId?: string | null;
  };

  const message = body.message?.trim();
  if (!body.botId || !message) {
    return NextResponse.json({ error: "Missing botId or message." }, { status: 400 });
  }

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", body.botId)
    .maybeSingle<Bot>();

  if (!bot) {
    return NextResponse.json({ error: "Assistant not found." }, { status: 404 });
  }

  return sseResponse((send) =>
    runChatTurn({
      supabase,
      bot,
      accountId: userId,
      plan,
      channel: "playground",
      conversationId: body.conversationId ?? null,
      message,
      send,
    }),
  );
}
