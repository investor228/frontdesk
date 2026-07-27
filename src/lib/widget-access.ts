import { appUrl } from "./utils";
import type { Bot } from "./types";

/**
 * Domain allow-listing for the widget.
 *
 * The widget renders inside an iframe served from our own origin, so requests
 * it makes are same-origin and carry our `Origin`. A request arriving with any
 * *other* origin came from somewhere else — someone lifted the public key onto
 * their own page — and must satisfy the bot's allowlist.
 *
 * This is a deterrent, not a security boundary: `Origin` and `Referer` are set
 * by the browser but can be forged by a non-browser client. The knowledge base
 * is the business's own public-facing FAQ, so the real protection against abuse
 * is the rate limiter plus the monthly message quota.
 */
export function isAllowedOrigin(bot: Bot, origin: string | null): boolean {
  if (bot.allowed_domains.length === 0) return true;
  if (!origin) return true; // no Origin header (e.g. server-side call) — fall through to the quota

  if (sameHost(origin, appUrl())) return true;

  const host = hostOf(origin);
  if (!host) return false;

  return bot.allowed_domains.some((domain) => {
    const allowed = normalizeDomain(domain);
    return host === allowed || host.endsWith(`.${allowed}`);
  });
}

/** Normalise whatever the owner typed into a bare hostname. */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function sameHost(a: string, b: string): boolean {
  const hostA = hostOf(a);
  const hostB = hostOf(b);
  return Boolean(hostA && hostB && hostA === hostB);
}

export const CORS_HEADERS: Record<string, string> = {
  // The endpoint is keyed by a public key and metered per account; any origin
  // may call it, and per-bot restriction is handled by isAllowedOrigin above.
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};
