"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Globe,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { Alert, Button, EmptyState, Input, Spinner } from "@/components/ui";
import { formatBytes, formatDate } from "@/lib/utils";
import type { Document } from "@/lib/types";

const ACCEPT = ".pdf,.docx,.txt,.md,.markdown,.csv,.json";

export function KnowledgeManager({
  botId,
  documents,
  maxFileBytes,
  canCrawlUrls,
  atLimit,
}: {
  botId: string;
  documents: Document[];
  maxFileBytes: number;
  canCrawlUrls: boolean;
  atLimit: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();

  async function post(body: FormData | string) {
    setError(null);
    setNeedsUpgrade(false);
    setUploading(true);

    try {
      const response = await fetch(`/api/bots/${botId}/documents`, {
        method: "POST",
        ...(typeof body === "string"
          ? { headers: { "content-type": "application/json" }, body }
          : { body }),
      });

      const result = (await response.json()) as { error?: string; upgrade?: boolean };
      if (!response.ok) {
        setNeedsUpgrade(Boolean(result.upgrade));
        throw new Error(result.error ?? "Upload failed.");
      }

      setUrl("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    // One request per file so a single bad file doesn't fail the whole batch.
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      await post(formData);
    }
  }

  async function remove(documentId: string) {
    await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  const busy = uploading || pending;

  return (
    <div>
      <div className="space-y-3 border-b border-line p-5">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!atLimit && event.dataTransfer.files.length) {
              void uploadFiles(event.dataTransfer.files);
            }
          }}
          className={[
            "rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
            dragging ? "border-brand-400 bg-brand-50" : "border-line bg-surface",
            atLimit ? "opacity-60" : "",
          ].join(" ")}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-sm text-muted">
              <Loader2 className="size-5 animate-spin text-brand-600" />
              Reading and indexing…
            </div>
          ) : (
            <>
              <Upload className="mx-auto size-5 text-faint" />
              <p className="mt-2 text-sm text-ink">
                Drop files here, or{" "}
                <button
                  type="button"
                  disabled={atLimit}
                  onClick={() => fileRef.current?.click()}
                  className="font-medium text-brand-700 underline underline-offset-2 disabled:no-underline disabled:opacity-50"
                >
                  browse
                </button>
              </p>
              <p className="mt-1 text-xs text-muted">
                PDF, DOCX, TXT, MD, CSV or JSON · up to {formatBytes(maxFileBytes)} each
              </p>
            </>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files?.length) void uploadFiles(event.target.files);
            }}
          />
        </div>

        {canCrawlUrls ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (url.trim()) void post(JSON.stringify({ url: url.trim() }));
            }}
            className="flex gap-2"
          >
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              type="url"
              placeholder="https://yoursite.com/services"
              disabled={busy || atLimit}
            />
            <Button type="submit" variant="secondary" disabled={busy || atLimit || !url.trim()}>
              <Globe className="size-4" />
              Import
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted">
            Importing straight from a website URL is a{" "}
            <Link href="/dashboard/billing" className="font-medium text-brand-700 hover:underline">
              Business
            </Link>{" "}
            feature.
          </p>
        )}

        {atLimit && (
          <Alert tone="warn">
            You&apos;ve hit the document limit for this plan.{" "}
            <Link href="/dashboard/billing" className="font-medium underline">
              Upgrade
            </Link>{" "}
            to add more.
          </Alert>
        )}

        {error && (
          <Alert
            tone="danger"
            action={
              needsUpgrade ? (
                <Link
                  href="/dashboard/billing"
                  className="shrink-0 font-medium underline"
                >
                  Upgrade
                </Link>
              ) : undefined
            }
          >
            {error}
          </Alert>
        )}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-7" />}
          title="Nothing uploaded yet"
          description="Start with your price list — it answers the question you get most."
        />
      ) : (
        <ul className="divide-y divide-line">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 px-5 py-3.5">
              <StatusIcon status={document.status} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {document.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {document.status === "failed"
                    ? document.error
                    : `${document.char_count.toLocaleString()} characters · ${formatDate(document.created_at)}`}
                </p>
              </div>

              <button
                onClick={() => void remove(document.id)}
                disabled={busy}
                aria-label={`Delete ${document.title}`}
                className="shrink-0 rounded-lg p-2 text-faint transition hover:bg-danger-bg hover:text-danger disabled:opacity-40"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <div className="flex items-center gap-2 border-t border-line px-5 py-2 text-xs text-muted">
          <Spinner className="size-3" />
          Refreshing…
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: Document["status"] }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-4 shrink-0 text-success" />;
  }
  if (status === "failed") {
    return <AlertCircle className="size-4 shrink-0 text-danger" />;
  }
  return <Loader2 className="size-4 shrink-0 animate-spin text-faint" />;
}
