import { FileText } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui";
import { KnowledgeManager } from "./knowledge-manager";
import type { Document } from "@/lib/types";

export const metadata = { title: "Knowledge" };

export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  const { plan } = await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("bot_id", botId)
    .order("created_at", { ascending: false })
    .returns<Document[]>();

  const documents = data ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader
          title="Knowledge base"
          description="Everything your assistant is allowed to answer from."
          action={
            <span className="shrink-0 text-sm text-muted">
              {documents.length}/{plan.limits.documentsPerBot}
            </span>
          }
        />
        <KnowledgeManager
          botId={botId}
          documents={documents}
          maxFileBytes={plan.limits.maxFileBytes}
          canCrawlUrls={plan.features.websiteCrawl}
          atLimit={documents.length >= plan.limits.documentsPerBot}
        />
      </Card>

      <aside className="space-y-4">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FileText className="size-4 text-brand-600" />
            What to upload
          </h3>
          <ul className="mt-3 space-y-2.5 text-sm text-muted">
            <li>
              <span className="font-medium text-ink">Your price list.</span> The
              single most-asked question, and the one people leave over.
            </li>
            <li>
              <span className="font-medium text-ink">Opening hours and address.</span>{" "}
              Include parking and public transport if it&apos;s ever asked.
            </li>
            <li>
              <span className="font-medium text-ink">Booking and cancellation policy.</span>{" "}
              Deposits, no-shows, how far ahead to book.
            </li>
            <li>
              <span className="font-medium text-ink">Service descriptions.</span> How
              long each one takes and what it includes.
            </li>
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
            The assistant answers strictly from these documents. If something
            isn&apos;t here, it says so instead of guessing.
          </p>
        </Card>
      </aside>
    </div>
  );
}
