import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert, Card, CardHeader } from "@/components/ui";
import { Playground } from "./playground";
import type { Bot } from "@/lib/types";

export const metadata = { title: "Test it" };

export default async function PlaygroundPage({
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

  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", botId)
    .eq("status", "ready");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {(count ?? 0) === 0 && (
        <Alert tone="warn">
          There&apos;s nothing in the knowledge base yet, so the assistant will say
          it can&apos;t help.{" "}
          <Link href={`/dashboard/bots/${botId}`} className="font-medium underline">
            Upload a document
          </Link>{" "}
          first.
        </Alert>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          title="Test your assistant"
          description="Exactly what visitors see, minus the widget frame. These answers count towards your monthly quota."
        />
        <Playground
          botId={bot.id}
          greeting={bot.greeting}
          accentColor={plan.features.customAccentColor ? bot.accent_color : "#0f766e"}
        />
      </Card>
    </div>
  );
}
