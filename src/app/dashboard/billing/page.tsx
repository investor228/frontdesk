import { requireSession } from "@/lib/auth";
import { isBillingConfigured } from "@/lib/stripe";
import { Alert, Card, CardHeader } from "@/components/ui";
import { PlanCards } from "@/components/plan-cards";
import { ManageSubscription } from "./manage-subscription";

export const metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { upgraded } = await searchParams;
  const { account, plan } = await requireSession();
  const billingConfigured = isBillingConfigured();

  const periodStart = new Date(account.period_start).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          You&apos;re on the {plan.name} plan.
        </p>
      </div>

      {upgraded && (
        <Alert tone="success">
          Thanks — your upgrade is being confirmed by Stripe. If the plan below
          still says Free, refresh in a few seconds.
        </Alert>
      )}

      {!billingConfigured && (
        <Alert tone="warn">
          Stripe keys aren&apos;t set on this deployment, so checkout is disabled.
          Add <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PRICE_PRO</code> and{" "}
          <code>STRIPE_PRICE_BUSINESS</code> to enable it.
        </Alert>
      )}

      <Card>
        <CardHeader
          title="This month"
          description={`Usage resets on the 1st. Current period started ${periodStart}.`}
          action={
            account.stripe_customer_id ? <ManageSubscription /> : undefined
          }
        />
        <div className="grid gap-px bg-line sm:grid-cols-3">
          <Stat
            label="Answers used"
            value={`${account.messages_used.toLocaleString()} / ${plan.limits.messagesPerMonth.toLocaleString()}`}
          />
          <Stat label="Assistants included" value={String(plan.limits.bots)} />
          <Stat
            label="Documents per assistant"
            value={plan.limits.documentsPerBot.toLocaleString()}
          />
        </div>
      </Card>

      <PlanCards
        mode="billing"
        currentPlan={plan.id}
        billingConfigured={billingConfigured}
      />

      <p className="text-center text-xs text-muted">
        Test mode — use card <code className="text-ink">4242 4242 4242 4242</code>{" "}
        with any future expiry and CVC. No real charges are made.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-raised px-5 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
