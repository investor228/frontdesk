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
 * Backoff schedules in milliseconds, chosen by who is waiting.
 *
 * The free tier rate-limits per minute, so a burst of requests will hit 429 and
 * clear on its own. How long we're willing to wait for that differs by caller:
 *
 * - `patient` is for ingestion. Someone uploaded a file and is watching a
 *   progress indicator; waiting out the window beats failing the upload.
 * - `impatient` is for answering. A visitor sitting in a chat widget will not
 *   wait a minute, so we try briefly and then say so plainly.
 */
const BACKOFF = {
  patient: [2_000, 5_000, 12_000, 25_000, 30_000],
  impatient: [1_500, 4_000],
} as const;

export async function geminiPost(
  url: string,
  body: unknown,
  { patience = "patient" }: { patience?: keyof typeof BACKOFF } = {},
): Promise<Response> {
  const delays = BACKOFF[patience];
  let lastError = "";

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: geminiHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (response.ok) return response;

    lastError = (await response.text()).slice(0, 300);

    if (!RETRYABLE.has(response.status) || attempt === delays.length) {
      throw new Error(friendlyError(response.status, lastError));
    }

    await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
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
