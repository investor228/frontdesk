import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isBillingConfigured } from "@/lib/stripe";
import { PLANS, stripePriceId, type PlanId } from "@/lib/plans";
import { appUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't configured on this deployment." },
      { status: 501 },
    );
  }

  const { userId, account } = await requireSession();
  const { planId } = (await request.json()) as { planId?: PlanId };

  const plan = planId ? PLANS[planId] : undefined;
  const priceId = plan ? stripePriceId(plan) : null;

  if (!plan || !priceId) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const stripe = getStripe();
  let customerId = account.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: account.email,
      name: account.company_name ?? undefined,
      // The webhook resolves the account from this, so it must always be set.
      metadata: { accountId: userId },
    });
    customerId = customer.id;

    const supabase = await createClient();
    await supabase
      .from("accounts")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    subscription_data: { metadata: { accountId: userId } },
    success_url: `${appUrl()}/dashboard/billing?upgraded=1`,
    cancel_url: `${appUrl()}/dashboard/billing`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
