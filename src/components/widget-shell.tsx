"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Chat } from "./chat";

export type WidgetShellProps = {
  publicKey: string;
  name: string;
  greeting: string;
  accentColor: string;
  suggestions: string[];
  leadCapture: boolean;
  showBranding: boolean;
  appUrl: string;
};

/**
 * The whole widget, rendered inside the iframe. It owns the open/closed state
 * and tells the host page to resize the frame via postMessage — the loader
 * script has no UI of its own.
 */
export function WidgetShell({
  publicKey,
  name,
  greeting,
  accentColor,
  suggestions,
  leadCapture,
  showBranding,
  appUrl,
}: WidgetShellProps) {
  const [open, setOpen] = useState(false);

  const notifyParent = useCallback((next: boolean) => {
    if (window.parent === window) return; // opened directly, not embedded
    window.parent.postMessage(
      { type: next ? "frontdesk:open" : "frontdesk:close" },
      "*",
    );
  }, []);

  useEffect(() => {
    notifyParent(open);
  }, [open, notifyParent]);

  // Escape closes the panel, matching every other chat widget.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) {
    return (
      <div className="flex h-dvh w-full items-end justify-end p-4">
        <button
          onClick={() => setOpen(true)}
          aria-label={`Chat with ${name}`}
          className="grid size-14 place-items-center rounded-full text-white shadow-lg transition hover:scale-105 active:scale-95"
          style={{ background: accentColor }}
        >
          <MessageCircle className="size-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full items-end justify-end p-0 sm:p-3">
      <div className="flex h-full w-full flex-col overflow-hidden border-line bg-raised shadow-2xl sm:h-[620px] sm:max-h-full sm:w-[400px] sm:rounded-2xl sm:border">
        <header
          className="flex shrink-0 items-center justify-between px-4 py-3 text-white"
          style={{ background: accentColor }}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-[11px] opacity-80">Usually replies instantly</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="grid size-8 place-items-center rounded-lg transition hover:bg-white/15"
          >
            <X className="size-4" />
          </button>
        </header>

        <Chat
          className="min-h-0 flex-1"
          endpoint="/api/widget/chat"
          payload={{ publicKey }}
          greeting={greeting}
          accentColor={accentColor}
          suggestions={suggestions}
          leadCaptureKey={leadCapture ? publicKey : null}
        />

        {showBranding && (
          <a
            href={`${appUrl}?utm_source=widget`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 border-t border-line bg-surface py-1.5 text-center text-[11px] text-faint transition hover:text-muted"
          >
            Powered by Frontdesk
          </a>
        )}
      </div>
    </div>
  );
}
