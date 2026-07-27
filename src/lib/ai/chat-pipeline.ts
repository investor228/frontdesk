import type { SupabaseClient } from "@supabase/supabase-js";
import { retrieve, streamAnswer, type Turn } from "./answer";
import type { ChatEvent } from "@/lib/sse";
import type { Bot } from "@/lib/types";
import type { Plan } from "@/lib/plans";

/** Turns of prior conversation replayed to the model. */
const HISTORY_TURNS = 8;

export type ChatRequest = {
  /** Admin client for the widget, RLS-scoped client for the playground. */
  supabase: SupabaseClient;
  bot: Bot;
  accountId: string;
  plan: Plan;
  channel: "playground" | "widget";
  conversationId: string | null;
  message: string;
  send: (event: ChatEvent) => void;
};

/**
 * One turn of chat: meter, retrieve, answer, persist. Shared by the in-app
 * playground and the public widget so both behave identically.
 */
export async function runChatTurn(req: ChatRequest): Promise<void> {
  const { supabase, bot, accountId, plan, channel, message, send } = req;

  const { data: quota, error: quotaError } = await supabase
    .rpc("try_consume_message", {
      p_account_id: accountId,
      p_limit: plan.limits.messagesPerMonth,
    })
    .single<{ allowed: boolean; used: number }>();

  if (quotaError) throw new Error(quotaError.message);

  if (!quota?.allowed) {
    send({
      type: "error",
      message:
        channel === "widget"
          ? "This assistant has reached its monthly message limit. Please contact the business directly."
          : `You've used all ${plan.limits.messagesPerMonth} answers on the ${plan.name} plan this month. Upgrade for more.`,
      upgrade: channel === "playground",
    });
    return;
  }

  const conversationId = await ensureConversation(supabase, req);
  send({ type: "meta", conversationId });

  const history = await loadHistory(supabase, conversationId);
  const matches = await retrieve(supabase, bot.id, message);

  let streamed = "";
  const result = await streamAnswer({
    bot,
    model: plan.model,
    matches,
    history,
    question: message,
    leadCapture: plan.features.leadCapture && bot.lead_capture && channel === "widget",
    onDelta: (text) => {
      streamed += text;
      send({ type: "delta", text });
    },
  });

  // Persist both turns together so history never records a question with no answer.
  await supabase.from("messages").insert([
    { conversation_id: conversationId, role: "user", content: message },
    {
      conversation_id: conversationId,
      role: "assistant",
      content: result.text || streamed,
      sources: result.sources,
      unanswered: result.unanswered,
    },
  ]);

  send({ type: "done", sources: result.sources, unanswered: result.unanswered });
}

async function ensureConversation(
  supabase: SupabaseClient,
  req: ChatRequest,
): Promise<string> {
  if (req.conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", req.conversationId)
      .eq("bot_id", req.bot.id)
      .maybeSingle();
    if (data) return data.id as string;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ bot_id: req.bot.id, channel: req.channel })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not start a conversation.");
  }
  return data.id as string;
}

async function loadHistory(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Turn[]> {
  const { data } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS);

  return ((data ?? []) as Turn[]).reverse();
}
