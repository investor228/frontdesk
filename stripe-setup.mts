/**
 * One-time Stripe test-mode setup.
 *
 * Creates the two paid products, a webhook endpoint pointing at the deployed
 * app, and the customer portal configuration (without which the "Manage
 * subscription" button fails with "No configuration provided").
 *
 * Idempotent: reruns reuse anything already tagged with our metadata marker
 * rather than creating duplicates.
 *
 *   npx tsx --env-file=.env.local stripe-setup.mts https://your-app.vercel.app
 */
import Stripe from "stripe";
import { PLANS } from "./src/lib/plans";

const APP_URL = (process.argv[2] ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
if (!APP_URL.startsWith("http")) {
  throw new Error("Pass the deployed app URL, e.g. https://frontdesk-jet.vercel.app");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const MARKER = "frontdesk_plan"; // metadata key used to find our own objects

if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
  throw new Error("Refusing to run: STRIPE_SECRET_KEY is not a test-mode key.");
}

console.log(`app url: ${APP_URL}\n`);

const priceIds: Record<string, string> = {};

for (const planId of ["pro", "business"] as const) {
  const plan = PLANS[planId];

  // --- product -------------------------------------------------------------
  const existingProducts = await stripe.products.search({
    query: `metadata['${MARKER}']:'${planId}'`,
  });

  const product =
    existingProducts.data[0] ??
    (await stripe.products.create({
      name: `Frontdesk ${plan.name}`,
      description: plan.tagline,
      metadata: { [MARKER]: planId },
    }));

  console.log(
    `${plan.name.padEnd(9)} product ${product.id} ${existingProducts.data[0] ? "(reused)" : "(created)"}`,
  );

  // --- price ---------------------------------------------------------------
  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });

  const wanted = plan.price * 100;
  const match = existingPrices.data.find(
    (p) =>
      p.unit_amount === wanted &&
      p.currency === "usd" &&
      p.recurring?.interval === "month",
  );

  const price =
    match ??
    (await stripe.prices.create({
      product: product.id,
      unit_amount: wanted,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { [MARKER]: planId },
    }));

  priceIds[planId] = price.id;
  console.log(
    `${"".padEnd(9)} price   ${price.id}  $${plan.price}/month ${match ? "(reused)" : "(created)"}\n`,
  );
}

// --- webhook ---------------------------------------------------------------
const WEBHOOK_URL = `${APP_URL}/api/stripe/webhook`;
const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const existingHook = endpoints.data.find((e) => e.url === WEBHOOK_URL);

let webhookSecret: string | null = null;

if (existingHook) {
  await stripe.webhookEndpoints.update(existingHook.id, { enabled_events: EVENTS });
  console.log(`webhook  ${existingHook.id} (reused — signing secret not re-shown by Stripe)`);
} else {
  const created = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: "Frontdesk — syncs plan state after checkout and subscription changes",
  });
  webhookSecret = created.secret ?? null;
  console.log(`webhook  ${created.id} (created)`);
}
console.log(`         ${WEBHOOK_URL}\n`);

// --- customer portal -------------------------------------------------------
const portalConfigs = await stripe.billingPortal.configurations.list({ limit: 10 });
const defaultConfig = portalConfigs.data.find((c) => c.is_default) ?? portalConfigs.data[0];

// Switching plans in the portal is declared by product, not by price alone.
const switchableProducts = [];
for (const planId of ["pro", "business"] as const) {
  const price = await stripe.prices.retrieve(priceIds[planId]);
  switchableProducts.push({
    product: typeof price.product === "string" ? price.product : price.product.id,
    prices: [priceIds[planId]],
  });
}

// Typed as the create shape — it requires `features`, and update accepts the
// same fields optionally, so one object satisfies both calls below.
const portalSettings: Stripe.BillingPortal.ConfigurationCreateParams = {
  business_profile: { headline: "Frontdesk — manage your subscription" },
  features: {
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products: switchableProducts,
    },
  },
};

if (defaultConfig) {
  await stripe.billingPortal.configurations.update(defaultConfig.id, portalSettings);
  console.log(`portal   ${defaultConfig.id} (updated)`);
} else {
  const created = await stripe.billingPortal.configurations.create(portalSettings);
  console.log(`portal   ${created.id} (created)`);
}

// --- output ----------------------------------------------------------------
console.log("\n────────────────────────────────────────────────");
console.log("Add these to Vercel → Settings → Environment Variables:\n");
console.log(`STRIPE_PRICE_PRO=${priceIds.pro}`);
console.log(`STRIPE_PRICE_BUSINESS=${priceIds.business}`);
if (webhookSecret) {
  console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
} else {
  console.log(
    "STRIPE_WEBHOOK_SECRET=(unchanged — the endpoint already existed;\n" +
      "  reveal it in the Stripe dashboard under Developers → Webhooks)",
  );
}
console.log("────────────────────────────────────────────────");
