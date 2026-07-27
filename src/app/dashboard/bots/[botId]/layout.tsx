import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BotTabs } from "./bot-tabs";
import type { Bot } from "@/lib/types";

export default async function BotLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  const { plan } = await requireSession();
  const supabase = await createClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", botId)
    .maybeSingle<Bot>();

  if (!bot) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          All assistants
        </Link>

        <div className="mt-3 flex items-center gap-3">
          <span
            className="size-3 rounded-full"
            style={{ background: bot.accent_color }}
            aria-hidden
          />
          <h1 className="text-2xl font-semibold text-ink">{bot.name}</h1>
        </div>
      </div>

      <BotTabs botId={bot.id} showLeads={plan.features.leadCapture} />

      {children}
    </div>
  );
}
