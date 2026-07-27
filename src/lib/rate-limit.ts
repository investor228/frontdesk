/**
 * Fixed-window rate limiter for the public widget endpoint.
 *
 * In-memory, so it's per-instance: on a multi-instance deploy the effective
 * limit is (limit × instances). That is fine as a first line of defence — the
 * hard cost ceiling is the per-account monthly message quota, which lives in
 * Postgres. Swap in Upstash/Redis here if you need an exact global limit.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;

export function rateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (windows.size > 10_000) sweep(now);
    return { ok: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

function sweep(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/** Best-effort client IP from the proxy headers Vercel and friends set. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
