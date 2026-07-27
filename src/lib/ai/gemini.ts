/**
 * Thin client for the Gemini REST API.
 *
 * Deliberately not using an SDK: we need exactly two calls (embed and stream),
 * and hand-rolling them keeps the streaming path transparent and avoids a
 * dependency for ~60 lines of fetch.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export function geminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

export function geminiHeaders(): Record<string, string> {
  return { "content-type": "application/json", "x-goog-api-key": geminiKey() };
}

export function geminiUrl(model: string, method: string, query = ""): string {
  return `${BASE}/models/${model}:${method}${query}`;
}

/** Status codes worth retrying: rate limit and transient server errors. */
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/**
 * POST with backoff on rate limits. The free tier's quota is low enough that a
 * document of any size will hit it, and failing the upload for a limit that
 * clears in two seconds would be a poor experience.
 */
export async function geminiPost(
  url: string,
  body: unknown,
  { attempts = 4 }: { attempts?: number } = {},
): Promise<Response> {
  let lastError = "";

  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: geminiHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (response.ok) return response;

    lastError = (await response.text()).slice(0, 300);

    if (!RETRYABLE.has(response.status) || attempt === attempts - 1) {
      throw new Error(friendlyError(response.status, lastError));
    }

    // 2s, 4s, 8s — long enough for a per-minute quota window to move on.
    await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
  }

  throw new Error(lastError || "Gemini request failed.");
}

function friendlyError(status: number, body: string): string {
  if (status === 429) {
    return "The AI service is rate limited right now. Wait a moment and try again.";
  }
  if (status === 400 && body.includes("API key")) {
    return "The Gemini API key is invalid. Check GEMINI_API_KEY.";
  }
  if (status === 403) {
    return "The Gemini API key was rejected. Check that it's enabled for this project.";
  }
  return `The AI service returned ${status}.`;
}
