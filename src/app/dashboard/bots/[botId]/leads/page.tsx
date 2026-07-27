import { Mail } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Lead } from "@/lib/types";

export const metadata = { title: "Leads" };

export default async function LeadsPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("bot_id", botId)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Lead[]>();

  const leads = data ?? [];

  return (
    <Card>
      <CardHeader
        title="Leads"
        description="Visitors who left their email after the assistant couldn't answer."
        action={<span className="shrink-0 text-sm text-muted">{leads.length}</span>}
      />

      {leads.length === 0 ? (
        <EmptyState
          icon={<Mail className="size-7" />}
          title="No leads yet"
          description="When the assistant hits a question your documents don't cover, it offers to take the visitor's email — and it lands here."
        />
      ) : (
        <ul className="divide-y divide-line">
          {leads.map((lead) => (
            <li key={lead.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {lead.email}
                  </a>
                  {lead.name && (
                    <span className="ml-2 text-sm text-muted">{lead.name}</span>
                  )}
                </div>
                <span className="text-xs text-faint">{formatDate(lead.created_at)}</span>
              </div>
              {lead.question && (
                <p className="mt-1.5 rounded-lg bg-surface px-3 py-2 text-sm text-muted">
                  &ldquo;{lead.question}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
