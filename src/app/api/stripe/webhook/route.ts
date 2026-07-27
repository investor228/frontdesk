import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planIdForPrice, type PlanId } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * Stripe webhook. This is the only thing that may change an account's plan —
 * the checkout redirect is a UX nicety and is never trusted on its own.
 *
 * Local development:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!secret || !signature) {
    return NextResponse.json({ error: "Not configured." }, { status: 400 });
  }

  // Signature verification needs the exact bytes Stripe signed.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          await syncSubscription(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id,
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySubscription(event.data.object);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    // Returning 500 makes Stripe retry, which is what we want for a transient
    // database failure.
    const message = error instanceof Error ? error.message : "Handler failed.";
    console.error(`[stripe] ${event.type}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(subscriptionId: string) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await applySubscription(subscription);
}

/** Statuses that should keep paid features switched on. */
const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

async function applySubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient();

  const accountId = await resolveAccountId(subscription);
  if (!accountId) {
    console.error(`[stripe] no account for subscription ${subscription.id}`);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? "";
  const paidPlan = planIdForPrice(priceId);
  const active = ACTIVE_STATUSES.has(subscription.status);

  const plan: PlanId = active && paidPlan ? paidPlan : "free";

  const { error } = await admin
    .from("accounts")
    .update({
      plan,
      stripe_subscription_id: active ? subscription.id : null,
    })
    .eq("id", accountId);

  if (error) throw new Error(error.message);
}

/** Prefer the metadata we set at checkout; fall back to the customer lookup. */
async function resolveAccountId(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.accountId;
  if (fromMetadata) return fromMetadata;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const { data } = await createAdminClient()
    .from("accounts")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}
