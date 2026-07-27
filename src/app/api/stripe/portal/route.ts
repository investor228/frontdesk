import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getStripe, isBillingConfigured } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";

export const runtime = "nodejs";

/** Opens Stripe's hosted portal so customers manage their own subscription. */
export async function POST() {
  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't configured on this deployment." },
      { status: 501 },
    );
  }

  const { account } = await requireSession();

  if (!account.stripe_customer_id) {
    return NextResponse.json(
      { error: "You don't have a subscription yet." },
      { status: 400 },
    );
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: `${appUrl()}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
