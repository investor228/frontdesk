"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, FileText, Sparkles } from "lucide-react";
import { readChatStream } from "@/lib/sse";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  unanswered?: boolean;
  streaming?: boolean;
};

export type ChatProps = {
  /** Where to POST. `/api/chat` in the app, `/api/widget/chat` in the widget. */
  endpoint: string;
  /** Identifies the bot — `{ botId }` in the app, `{ publicKey }` in the widget. */
  payload: Record<string, string>;
  greeting: string;
  accentColor: string;
  suggestions?: string[];
  /** Public key enabling the lead form; null disables lead capture. */
  leadCaptureKey?: string | null;
  /** Rendered under the composer when the request fails with `upgrade: true`. */
  onUpgradeNeeded?: () => void;
  className?: string;
};

export function Chat({
  endpoint,
  payload,
  greeting,
  accentColor,
  suggestions = [],
  leadCaptureKey = null,
  onUpgradeNeeded,
  className,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    setInput("");
    setError(null);
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "", streaming: true },
    ]);

    // Mutate only the trailing assistant message as deltas arrive. If it was
    // already removed (error path), this is a no-op rather than corrupting the
    // user's own message.
    const patchLast = (patch: Partial<ChatMessage>) =>
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.role === "assistant" ? { ...m, ...patch } : m,
        ),
      );

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, message: question, conversationId }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not reach the assistant.");
      }

      let streamed = "";

      await readChatStream(response, (event) => {
        switch (event.type) {
          case "meta":
            setConversationId(event.conversationId);
            break;
          case "delta":
            streamed += event.text;
            patchLast({ content: streamed });
            break;
          case "done":
            patchLast({
              sources: event.sources,
              unanswered: event.unanswered,
              streaming: false,
            });
            break;
          case "error":
            setError(event.message);
            if (event.upgrade) onUpgradeNeeded?.();
            // Drop the empty assistant bubble; the error is shown separately.
            setMessages((prev) => prev.slice(0, -1));
            break;
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
      patchLast({ streaming: false });
      inputRef.current?.focus();
    }
  }

  const lastMessage = messages.at(-1);
  const showLeadForm =
    Boolean(leadCaptureKey) &&
    lastMessage?.role === "assistant" &&
    lastMessage.unanswered === true &&
    !lastMessage.streaming;

  const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.content;

  return (
    <div
      className={cn("flex min-h-0 flex-col bg-raised", className)}
      style={{ ["--accent" as string]: accentColor }}
    >
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
        <Bubble role="assistant">
          <p>{greeting}</p>
        </Bubble>

        {messages.length === 0 && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => send(suggestion)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-[var(--accent)] hover:text-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => (
          <Bubble key={index} role={message.role}>
            {message.role === "user" ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : message.content ? (
              <>
                <div className="answer">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
                    <span className="text-[11px] font-medium text-faint">Source</span>
                    {message.sources.map((source) => (
                      <span
                        key={source}
                        className="inline-flex max-w-[180px] items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted"
                      >
                        <FileText className="size-3 shrink-0" />
                        <span className="truncate">{source}</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <TypingDots />
            )}
          </Bubble>
        ))}

        {showLeadForm && lastQuestion && (
          <LeadForm
            publicKey={leadCaptureKey!}
            conversationId={conversationId}
            question={lastQuestion}
          />
        )}

        {error && (
          <div className="rounded-lg border border-danger/15 bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-line bg-raised p-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 rounded-xl border border-line bg-surface p-1.5 transition focus-within:border-[var(--accent)]"
        >
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(event) => {
              setInput(event.target.value);
              const el = event.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask a question…"
            className="max-h-[120px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-white transition disabled:opacity-30"
            style={{ background: "var(--accent)" }}
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  if (role === "user") {
    return (
      <div className="animate-rise flex justify-end">
        <div
          className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm text-white"
          style={{ background: "var(--accent)" }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise flex gap-2.5">
      <div
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white"
        style={{ background: "var(--accent)" }}
      >
        <Sparkles className="size-3.5" />
      </div>
      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink">
        {children}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1 py-1" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot size-1.5 rounded-full bg-faint"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

/** Shown when the bot couldn't answer, so the visit still produces a lead. */
function LeadForm({
  publicKey,
  conversationId,
  question,
}: {
  publicKey: string;
  conversationId: string | null;
  question: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  if (state === "done") {
    return (
      <div className="rounded-lg border border-success/15 bg-success-bg px-3.5 py-3 text-sm text-success">
        Thanks — we&apos;ve got your question and someone will email you back.
      </div>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setState("saving");
        try {
          const response = await fetch("/api/widget/lead", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ publicKey, email, name, question, conversationId }),
          });
          const body = (await response.json()) as { error?: string };
          if (!response.ok) throw new Error(body.error ?? "Could not send that.");
          setState("done");
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Could not send that.");
          setState("error");
        }
      }}
      className="rounded-lg border border-line bg-surface p-3.5"
    >
      <p className="text-sm font-medium text-ink">Want us to get back to you?</p>
      <p className="mt-0.5 text-xs text-muted">
        Leave your email and we&apos;ll answer this personally.
      </p>
      <div className="mt-2.5 space-y-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name (optional)"
          className="h-9 w-full rounded-lg border border-line bg-raised px-2.5 text-sm placeholder:text-faint focus:border-[var(--accent)] focus:outline-none"
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          placeholder="you@example.com"
          className="h-9 w-full rounded-lg border border-line bg-raised px-2.5 text-sm placeholder:text-faint focus:border-[var(--accent)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "saving"}
          className="h-9 w-full rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {state === "saving" ? "Sending…" : "Send"}
        </button>
        {state === "error" && <p className="text-xs text-danger">{message}</p>}
      </div>
    </form>
  );
}
