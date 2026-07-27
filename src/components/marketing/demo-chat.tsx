"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Mail, MessageCircle, Sparkles } from "lucide-react";

/**
 * Scripted preview of a real conversation, used on the landing page. It replays
 * three exchanges on a loop — including one the assistant can't answer, because
 * that behaviour is the product's main promise and worth showing up front.
 *
 * Nothing here calls the API; it's a demonstration, labelled as such.
 */

type Step = {
  question: string;
  answer: string;
  source?: string;
  /** Renders the lead-capture card instead of a source chip. */
  lead?: boolean;
};

const SCRIPT: Step[] = [
  {
    question: "How much is a balayage?",
    answer:
      "Balayage starts at $180 for shoulder-length hair and $220 for longer. That includes a toner and a blow-dry, and it takes around three hours.",
    source: "Price list 2026.pdf",
  },
  {
    question: "Are you open on Sundays?",
    answer:
      "We're closed on Sundays. We're open Tuesday to Friday, 10am–8pm, and Saturday, 9am–6pm.",
    source: "Hours & location.docx",
  },
  {
    question: "Do you do hair extensions?",
    answer:
      "I don't have anything about extensions in our materials, so I don't want to guess. Leave your email and Tatiana will get back to you personally.",
    lead: true,
  },
];

const TYPE_MS = 16;
const THINK_MS = 700;
const HOLD_MS = 3200;

export function DemoChat() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"asking" | "thinking" | "answering" | "held">(
    "asking",
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => timers.push(setTimeout(resolve, ms)));

    async function play() {
      const step = SCRIPT[index];

      setTyped("");
      setPhase("asking");
      await wait(400);
      if (cancelled) return;

      setPhase("thinking");
      await wait(THINK_MS);
      if (cancelled) return;

      setPhase("answering");
      for (let i = 1; i <= step.answer.length; i++) {
        await wait(TYPE_MS);
        if (cancelled) return;
        setTyped(step.answer.slice(0, i));
      }

      setPhase("held");
      await wait(HOLD_MS);
      if (cancelled) return;

      setIndex((current) => (current + 1) % SCRIPT.length);
    }

    void play();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [index]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [typed, phase]);

  const step = SCRIPT[index];
  const done = phase === "held";

  return (
    <div className="w-full max-w-[380px]">
      <div className="overflow-hidden rounded-2xl border border-line bg-raised shadow-[0_18px_50px_-20px_rgba(18,63,62,0.45)]">
        <header className="flex items-center justify-between bg-brand-600 px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold">Tatiana Beauty Studio</p>
            <p className="text-[11px] opacity-80">Usually replies instantly</p>
          </div>
          <MessageCircle className="size-5 opacity-80" />
        </header>

        <div ref={scrollRef} className="h-[330px] space-y-3.5 overflow-hidden px-4 py-4">
          <Assistant>
            Hi! I&apos;m the studio assistant. Ask me about services, prices or
            opening hours.
          </Assistant>

          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-sm text-white">
              {step.question}
            </div>
          </div>

          {phase === "thinking" && (
            <Assistant>
              <span className="flex gap-1 py-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="typing-dot size-1.5 rounded-full bg-faint"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </Assistant>
          )}

          {(phase === "answering" || done) && (
            <Assistant>
              <p>{typed}</p>
              {done && step.source && (
                <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2">
                  <span className="text-[11px] font-medium text-faint">Source</span>
                  <span className="inline-flex items-center gap-1 rounded bg-raised px-1.5 py-0.5 text-[11px] text-muted">
                    <FileText className="size-3" />
                    {step.source}
                  </span>
                </div>
              )}
            </Assistant>
          )}

          {done && step.lead && (
            <div className="animate-rise rounded-lg border border-line bg-surface p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
                <Mail className="size-3.5 text-brand-600" />
                Want us to get back to you?
              </p>
              <div className="mt-2 h-8 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-xs text-faint">
                you@example.com
              </div>
              <div className="mt-1.5 grid h-8 place-items-center rounded-lg bg-brand-600 text-xs font-medium text-white">
                Send
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-faint">
        A preview of a real conversation. Nothing is invented — every answer comes
        from an uploaded document.
      </p>
    </div>
  );
}

function Assistant({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-rise flex gap-2.5">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
        <Sparkles className="size-3.5" />
      </span>
      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink">
        {children}
      </div>
    </div>
  );
}
