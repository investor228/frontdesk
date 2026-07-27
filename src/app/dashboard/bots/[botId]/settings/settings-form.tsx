"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { updateBot, type FormState } from "@/app/dashboard/actions";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Spinner,
  Textarea,
} from "@/components/ui";
import type { Plan } from "@/lib/plans";
import type { Bot } from "@/lib/types";

const INITIAL: FormState = {};

const SWATCHES = ["#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#b45309", "#15803d"];

export function SettingsForm({
  bot,
  features,
  planName,
}: {
  bot: Bot;
  features: Plan["features"];
  planName: string;
}) {
  const [state, formAction, pending] = useActionState(updateBot, INITIAL);
  const [color, setColor] = useState(bot.accent_color);

  return (
    <form action={formAction}>
      <input type="hidden" name="botId" value={bot.id} />

      <Card>
        <CardHeader
          title="Assistant settings"
          description="How your assistant introduces itself and behaves."
        />

        <div className="space-y-5 p-5">
          <Field label="Name" htmlFor="name" hint="Shown in the widget header.">
            <Input id="name" name="name" defaultValue={bot.name} required />
          </Field>

          <Field
            label="Greeting"
            htmlFor="greeting"
            hint="The first thing a visitor reads."
          >
            <Textarea id="greeting" name="greeting" rows={2} defaultValue={bot.greeting} />
          </Field>

          <Field
            label="Extra instructions"
            htmlFor="instructions"
            hint="Optional. Tone, things to always mention, questions to redirect. The assistant still answers only from your documents."
          >
            <Textarea
              id="instructions"
              name="instructions"
              rows={4}
              defaultValue={bot.instructions}
              placeholder="Always mention that a 30% deposit is required for bookings over $200. Be warm but brief."
            />
          </Field>

          <Gated
            enabled={features.customAccentColor}
            planName={planName}
            label="Brand colour"
          >
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Use ${swatch}`}
                  className={[
                    "size-8 rounded-lg border-2 transition",
                    color.toLowerCase() === swatch ? "border-ink" : "border-transparent",
                  ].join(" ")}
                  style={{ background: swatch }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                aria-label="Custom colour"
                className="size-8 cursor-pointer rounded-lg border border-line bg-transparent"
              />
              <code className="text-xs text-muted">{color}</code>
            </div>
            <input type="hidden" name="accent_color" value={color} />
          </Gated>

          <Gated
            enabled={features.leadCapture}
            planName={planName}
            label="Capture leads"
          >
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                name="lead_capture"
                defaultChecked={bot.lead_capture}
                className="mt-0.5 size-4 accent-[var(--color-brand-600)]"
              />
              <span className="text-muted">
                When the assistant can&apos;t answer, ask the visitor for their
                email so you can follow up. Leads appear under the Leads tab.
              </span>
            </label>
          </Gated>

          <Gated
            enabled={features.domainAllowlist}
            planName={planName}
            label="Allowed domains"
          >
            <Textarea
              name="allowed_domains"
              rows={3}
              defaultValue={bot.allowed_domains.join("\n")}
              placeholder={"yoursite.com\nbooking.yoursite.com"}
            />
            <p className="mt-1.5 text-xs text-muted">
              One per line. Leave empty to allow any site. Subdomains are included
              automatically.
            </p>
          </Gated>

          {state.error && <Alert tone="danger">{state.error}</Alert>}
          {state.saved && <Alert tone="success">Saved. Changes are live.</Alert>}
        </div>

        <div className="border-t border-line px-5 py-4">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            Save changes
          </Button>
        </div>
      </Card>
    </form>
  );
}

/** Renders a setting, or a locked placeholder pointing at billing. */
function Gated({
  enabled,
  planName,
  label,
  children,
}: {
  enabled: boolean;
  planName: string;
  label: string;
  children: React.ReactNode;
}) {
  if (enabled) {
    return (
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {children}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <Lock className="size-3.5 text-faint" />
        <span className="text-sm font-medium text-muted">{label}</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Not included in {planName}.{" "}
        <Link href="/dashboard/billing" className="font-medium text-brand-700 hover:underline">
          See plans
        </Link>
      </p>
    </div>
  );
}
