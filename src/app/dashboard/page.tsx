import Link from "next/link";
import { Bot as BotIcon, FileText, MessageSquare, Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState } from "@/components/ui";
import { NewBotForm } from "./new-bot-form";
import type { Bot } from "@/lib/types";

export const metadata = { title: "Your assistants" };

type BotRow = Bot & {
  documents: { count: number }[];
  conversations: { count: number }[];
};

export default async function DashboardPage() {
  const { plan } = await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("bots")
    .select("*, documents(count), conversations(count)")
    .order("created_at", { ascending: true })
    .returns<BotRow[]>();

  const bots = data ?? [];
  const atLimit = bots.length >= plan.limits.bots;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Your assistants</h1>
          <p className="mt-1 text-sm text-muted">
            {bots.length} of {plan.limits.bots} used on the {plan.name} plan.
          </p>
        </div>
        {bots.length > 0 && !atLimit && <NewBotForm compact />}
      </div>

      {bots.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BotIcon className="size-8" />}
            title="No assistants yet"
            description="Create one, upload your price list or FAQ, and paste a single line of code into your site."
            action={<NewBotForm />}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Link key={bot.id} href={`/dashboard/bots/${bot.id}`} className="group">
              <Card className="h-full p-5 transition group-hover:border-brand-300 group-hover:shadow-sm">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg text-white"
                    style={{ background: bot.accent_color }}
                  >
                    <BotIcon className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{bot.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {bot.greeting}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    {bot.documents[0]?.count ?? 0} docs
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare className="size-3.5" />
                    {bot.conversations[0]?.count ?? 0} chats
                  </span>
                </div>
              </Card>
            </Link>
          ))}

          {atLimit && (
            <Card className="flex flex-col items-center justify-center gap-2 border-dashed p-5 text-center">
              <Plus className="size-5 text-faint" />
              <p className="text-sm font-medium text-ink">Assistant limit reached</p>
              <Link
                href="/dashboard/billing"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Upgrade for more
              </Link>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
