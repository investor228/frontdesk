"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui";

export function InstallSnippet({
  snippet,
  previewUrl,
}: {
  snippet: string;
  previewUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure origin / permissions) — the code is
      // selectable on screen, so there's nothing to recover from.
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-line bg-ink p-4">
        <code className="whitespace-pre text-[13px] leading-relaxed text-sand-200">
          {snippet}
        </code>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy snippet"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="size-4" />
          Preview widget
        </Button>
      </div>
    </div>
  );
}
