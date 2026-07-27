/**
 * Plan definitions. This file is the single source of truth for every limit and
 * gated feature — the UI reads it to render the pricing table, and the API
 * routes read it to enforce. Never gate a feature in the client only.
 */

export type PlanId = "free" | "pro" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  /** Monthly price in USD. */
  price: number;
  tagline: string;
  /** Env var holding the Stripe price id; null for the free plan. */
  stripePriceEnv: "STRIPE_PRICE_PRO" | "STRIPE_PRICE_BUSINESS" | null;
  limits: {
    bots: number;
    documentsPerBot: number;
    messagesPerMonth: number;
    maxFileBytes: number;
  };
  features: {
    /** "Powered by Frontdesk" in the widget — removable on paid plans. */
    removeBranding: boolean;
    customAccentColor: boolean;
    leadCapture: boolean;
    domainAllowlist: boolean;
    websiteCrawl: boolean;
    conversationExport: boolean;
  };
  /** Gemini model used to answer. Business gets the stronger one. */
  model: string;
  /** Bullets shown on the pricing table. */
  highlights: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    tagline: "Try it on your own FAQ before you commit.",
    stripePriceEnv: null,
    limits: {
      bots: 1,
      documentsPerBot: 3,
      messagesPerMonth: 50,
      maxFileBytes: 2 * 1024 * 1024,
    },
    features: {
      removeBranding: false,
      customAccentColor: false,
      leadCapture: false,
      domainAllowlist: false,
      websiteCrawl: false,
      conversationExport: false,
    },
    model: "gemini-3.6-flash",
    highlights: [
      "1 assistant",
      "3 documents (2 MB each)",
      "50 answers / month",
      "Embeddable widget",
      "Answers cite their source",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 29,
    tagline: "For a salon, studio or clinic that answers the same 20 questions daily.",
    stripePriceEnv: "STRIPE_PRICE_PRO",
    limits: {
      bots: 3,
      documentsPerBot: 100,
      messagesPerMonth: 2000,
      maxFileBytes: 10 * 1024 * 1024,
    },
    features: {
      removeBranding: true,
      customAccentColor: true,
      leadCapture: true,
      domainAllowlist: true,
      websiteCrawl: false,
      conversationExport: false,
    },
    model: "gemini-3.6-flash",
    highlights: [
      "3 assistants",
      "100 documents (10 MB each)",
      "2,000 answers / month",
      "Remove Frontdesk branding",
      "Match your brand colour",
      "Capture leads when the bot can't answer",
      "Lock the widget to your domains",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    price: 99,
    tagline: "For multi-location businesses and agencies running several clients.",
    stripePriceEnv: "STRIPE_PRICE_BUSINESS",
    limits: {
      bots: 10,
      documentsPerBot: 1000,
      messagesPerMonth: 10000,
      maxFileBytes: 25 * 1024 * 1024,
    },
    features: {
      removeBranding: true,
      customAccentColor: true,
      leadCapture: true,
      domainAllowlist: true,
      websiteCrawl: true,
      conversationExport: true,
    },
    // Alias, so the top tier tracks the current Pro model without a code change.
    model: "gemini-pro-latest",
    highlights: [
      "10 assistants",
      "1,000 documents (25 MB each)",
      "10,000 answers / month",
      "Import straight from your website URL",
      "Highest-capability model for answers",
      "Export conversation history",
      "Everything in Pro",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "business"];

export function planOf(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? "free"] ?? PLANS.free;
}

/** Resolve the Stripe price id for a paid plan, or null for free. */
export function stripePriceId(plan: Plan): string | null {
  if (!plan.stripePriceEnv) return null;
  return process.env[plan.stripePriceEnv] ?? null;
}

/** Map a Stripe price id back to a plan — used by the webhook. */
export function planIdForPrice(priceId: string): PlanId | null {
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId && priceId === process.env.STRIPE_PRICE_BUSINESS) return "business";
  return null;
}
