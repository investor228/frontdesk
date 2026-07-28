/**
 * Seeds believable demo tenants across Supabase and Stripe.
 *
 * These are DEMO ACCOUNTS in a Stripe sandbox, not customers. They exist so the
 * dashboards are legible on video and so the billing states the webhook has to
 * handle — free, active, trialing, cancelling — are all visible at once.
 *
 *   npx tsx --env-file=.env.local demo-assets/seed-demo-data.mts
 *   npx tsx --env-file=.env.local demo-assets/seed-demo-data.mts --clean
 *
 * Idempotent: rerunning reuses anything already created. `--clean` removes every
 * account it made, and cancels their Stripe subscriptions, leaving your own
 * account untouched.
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { PLANS, type PlanId } from "../src/lib/plans";

const PASSWORD = "FrontdeskDemo2026!";

type Seed = {
  email: string;
  company: string;
  plan: PlanId;
  /** How the Stripe subscription should end up, for paid plans. */
  state?: "active" | "trialing" | "cancelling";
  botName: string;
  documents: string[];
  messagesUsed: number;
  conversations: number;
  leads: number;
};

const SEEDS: Seed[] = [
  {
    email: "hello@ironforgegym.demo",
    company: "Iron Forge Gym",
    plan: "business",
    state: "active",
    botName: "Iron Forge Gym",
    documents: ["Membership plans 2026.pdf", "Class timetable.pdf", "Gym rules.docx"],
    messagesUsed: 3184,
    conversations: 412,
    leads: 23,
  },
  {
    email: "front@brightsmiledental.demo",
    company: "Bright Smile Dental",
    plan: "pro",
    state: "active",
    botName: "Bright Smile Dental",
    documents: ["Treatment price list.pdf", "Insurance we accept.pdf"],
    messagesUsed: 869,
    conversations: 137,
    leads: 11,
  },
  {
    email: "studio@zenyogaloft.demo",
    company: "Zen Yoga Loft",
    plan: "pro",
    state: "trialing",
    botName: "Zen Yoga Loft",
    documents: ["Class passes & pricing.pdf"],
    messagesUsed: 214,
    conversations: 38,
    leads: 4,
  },
  {
    email: "book@bellanailsbar.demo",
    company: "Bella Nails Bar",
    plan: "pro",
    state: "cancelling",
    botName: "Bella Nails Bar",
    documents: ["Service menu.pdf", "Cancellation policy.txt"],
    messagesUsed: 1502,
    conversations: 201,
    leads: 9,
  },
  {
    email: "info@quickfixrepair.demo",
    company: "QuickFix Appliance Repair",
    plan: "free",
    botName: "QuickFix Repair",
    documents: ["Callout rates.txt", "Areas we cover.txt"],
    messagesUsed: 47,
    conversations: 19,
    leads: 0,
  },
  {
    email: "hi@thebarbershopminsk.demo",
    company: "The Barbershop",
    plan: "free",
    botName: "The Barbershop",
    documents: ["Prices.txt"],
    messagesUsed: 12,
    conversations: 6,
    leads: 0,
  },
];

const SAMPLE_QUESTIONS = [
  "How much is a session?",
  "What are your opening hours?",
  "Do I need to book in advance?",
  "Where are you located?",
  "Do you have parking?",
  "Can I pay by card?",
];

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
  throw new Error("Refusing to run: STRIPE_SECRET_KEY is not a test-mode key.");
}

const clean = process.argv.includes("--clean");

/** Look up a seeded auth user by email, since there is no direct get-by-email. */
async function findUser(email: string) {
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

if (clean) {
  for (const seed of SEEDS) {
    const user = await findUser(seed.email);
    if (!user) continue;

    const { data: account } = await db
      .from("accounts")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle<{ stripe_subscription_id: string | null; stripe_customer_id: string | null }>();

    if (account?.stripe_subscription_id) {
      await stripe.subscriptions.cancel(account.stripe_subscription_id).catch(() => {});
    }
    if (account?.stripe_customer_id) {
      await stripe.customers.del(account.stripe_customer_id).catch(() => {});
    }

    // Deleting the auth user cascades to the account and everything under it.
    await db.auth.admin.deleteUser(user.id);
    console.log(`removed  ${seed.company}`);
  }
  console.log("\nDemo tenants removed. Your own account was not touched.");
  process.exit(0);
}

for (const seed of SEEDS) {
  const plan = PLANS[seed.plan];

  // --- auth user + account -------------------------------------------------
  let user = await findUser(seed.email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email: seed.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`${seed.email}: ${error.message}`);
    user = data.user;
  }

  // --- Stripe customer + subscription for paid plans -----------------------
  let customerId: string | null = null;
  let subscriptionId: string | null = null;

  if (seed.plan !== "free") {
    const found = await stripe.customers.search({
      query: `metadata['accountId']:'${user.id}'`,
    });

    const customer =
      found.data[0] ??
      (await stripe.customers.create({
        email: seed.email,
        name: seed.company,
        metadata: { accountId: user.id },
      }));
    customerId = customer.id;

    const existingSubs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 5,
    });
    let subscription = existingSubs.data.find((s) =>
      ["active", "trialing", "past_due"].includes(s.status),
    );

    if (!subscription) {
      // A test payment method, so the subscription bills like a real one.
      const pm = await stripe.paymentMethods.attach("pm_card_visa", {
        customer: customer.id,
      });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: pm.id },
      });

      const priceId =
        seed.plan === "business"
          ? process.env.STRIPE_PRICE_BUSINESS!
          : process.env.STRIPE_PRICE_PRO!;

      subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        metadata: { accountId: user.id },
        ...(seed.state === "trialing" ? { trial_period_days: 14 } : {}),
      });

      if (seed.state === "cancelling") {
        subscription = await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: true,
        });
      }
    }
    subscriptionId = subscription.id;
  }

  await db
    .from("accounts")
    .update({
      company_name: seed.company,
      plan: seed.plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      messages_used: seed.messagesUsed,
    })
    .eq("id", user.id);

  // --- bot ------------------------------------------------------------------
  const { data: existingBot } = await db
    .from("bots")
    .select("id")
    .eq("account_id", user.id)
    .maybeSingle<{ id: string }>();

  let botId = existingBot?.id;

  if (!botId) {
    const { data: bot } = await db
      .from("bots")
      .insert({
        account_id: user.id,
        name: seed.botName,
        greeting: `Hi! I'm the ${seed.botName} assistant. Ask me about our services, prices or hours.`,
        lead_capture: plan.features.leadCapture,
      })
      .select("id")
      .single<{ id: string }>();
    botId = bot!.id;

    await db.from("documents").insert(
      seed.documents.map((title) => ({
        bot_id: botId!,
        title,
        source: title,
        kind: title.endsWith(".pdf") ? "pdf" : title.endsWith(".docx") ? "docx" : "text",
        status: "ready",
        char_count: 1200 + Math.floor(Math.random() * 5000),
      })),
    );

    // Conversation history, so the dashboard counters aren't zero. No chunks are
    // written, so these assistants answer "I don't know" rather than nonsense.
    for (let i = 0; i < Math.min(seed.conversations, 12); i++) {
      const { data: conversation } = await db
        .from("conversations")
        .insert({ bot_id: botId, channel: i % 4 === 0 ? "playground" : "widget" })
        .select("id")
        .single<{ id: string }>();

      const question = SAMPLE_QUESTIONS[i % SAMPLE_QUESTIONS.length];
      await db.from("messages").insert([
        { conversation_id: conversation!.id, role: "user", content: question },
        {
          conversation_id: conversation!.id,
          role: "assistant",
          content: "Answered from the knowledge base.",
          sources: [seed.documents[0]],
        },
      ]);
    }

    if (seed.leads > 0) {
      await db.from("leads").insert(
        Array.from({ length: Math.min(seed.leads, 6) }, (_, i) => ({
          bot_id: botId!,
          email: `visitor${i + 1}@example.com`,
          name: ["Anna", "Marc", "Julia", "Pavel", "Nina", "Oleg"][i],
          question: "Do you offer gift cards?",
        })),
      );
    }
  }

  console.log(
    `${seed.company.padEnd(28)} ${seed.plan.padEnd(9)} ${seed.state ?? "—"}`.trimEnd(),
  );
}

console.log(`\nSeeded ${SEEDS.length} demo tenants. Password for all: ${PASSWORD}`);
console.log("Remove them again with:  npx tsx --env-file=.env.local demo-assets/seed-demo-data.mts --clean");
