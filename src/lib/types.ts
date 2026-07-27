import type { PlanId } from "./plans";

export type Account = {
  id: string;
  email: string;
  company_name: string | null;
  plan: PlanId;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  period_start: string;
  messages_used: number;
  created_at: string;
};

export type Bot = {
  id: string;
  account_id: string;
  name: string;
  public_key: string;
  greeting: string;
  instructions: string;
  accent_color: string;
  allowed_domains: string[];
  lead_capture: boolean;
  created_at: string;
};

export type DocStatus = "processing" | "ready" | "failed";

export type Document = {
  id: string;
  bot_id: string;
  title: string;
  source: string;
  kind: "pdf" | "docx" | "text" | "url";
  status: DocStatus;
  error: string | null;
  char_count: number;
  created_at: string;
};

export type Conversation = {
  id: string;
  bot_id: string;
  channel: "playground" | "widget";
  created_at: string;
};

export type Message = {
  id: number;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sources: string[];
  unanswered: boolean;
  created_at: string;
};

export type Lead = {
  id: string;
  bot_id: string;
  conversation_id: string | null;
  name: string | null;
  email: string;
  question: string | null;
  created_at: string;
};

/** Shape returned by the match_chunks RPC. */
export type ChunkMatch = {
  content: string;
  document_title: string;
  similarity: number;
};
