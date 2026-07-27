import Stripe from "stripe";

let stripe: Stripe | null = null;

/** Lazily constructed so the app still builds without Stripe keys present. */
export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripe = new Stripe(key);
  }
  return stripe;
}

/** Billing is optional in local dev — the UI degrades to a notice without it. */
export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_PRO &&
      process.env.STRIPE_PRICE_BUSINESS,
  );
}
