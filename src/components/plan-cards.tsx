"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";
import { Alert, Button, LinkButton, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Pro is the plan most businesses actually need — say so, don't hide it. */
const RECOMMENDED: PlanId = "pro";

export function PlanCards({
  mode,
  currentPlan,
  billingConfigured = true,
}: {
  /** "marketing" links to signup; "billing" starts Stripe Checkout. */
  mode: "marketing" | "billing";
  currentPlan?: PlanId;
  billingConfigured?: boolean;
}) {
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(planId: PlanId) {
    setLoading(planId);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Could not start checkout.");
      }
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = currentPlan === planId;
          const recommended = planId === RECOMMENDED;

          return (
            <div
              key={planId}
              className={cn(
                "relative flex flex-col rounded-[var(--radius-card)] border bg-raised p-6",
                recommended
                  ? "border-brand-600 shadow-[0_0_0_1px_var(--color-brand-600)]"
                  : "border-line",
              )}
            >
              {recommended && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold text-ink">
                  ${plan.price}
                </span>
                <span className="text-sm text-muted">/month</span>
              </div>

              <p className="mt-2 min-h-[2.5rem] text-sm text-muted">{plan.tagline}</p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2.5 text-sm text-ink">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-600" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="secondary" disabled className="w-full">
                    Current plan
                  </Button>
                ) : mode === "marketing" ? (
                  <LinkButton
                    href="/signup"
                    variant={recommended ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {plan.price === 0 ? "Start free" : `Start with ${plan.name}`}
                  </LinkButton>
                ) : plan.price === 0 ? (
                  <Button variant="secondary" disabled className="w-full">
                    Downgrade from the portal
                  </Button>
                ) : (
                  <Button
                    onClick={() => void startCheckout(planId)}
                    disabled={loading !== null || !billingConfigured}
                    variant={recommended ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {loading === planId && <Spinner />}
                    Upgrade to {plan.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
