import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { DangerZone } from "./danger-zone";
import type { Bot } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  params,
}: {
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
    <div className="max-w-2xl space-y-6">
      <SettingsForm bot={bot} features={plan.features} planName={plan.name} />
      <DangerZone botId={bot.id} botName={bot.name} />
    </div>
  );
}
