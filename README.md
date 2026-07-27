# Frontdesk

Turn a business's own documents into a chat assistant that answers customer
questions — inside the app, and as a one-line embeddable widget on their
website.

Built for local service businesses: salons, studios, clinics, repair services.
The product's core promise is that it **answers only from uploaded documents** and
says so when it can't, because a bot that invents a price is worse than no bot.

---

## What's in here

| Area | Where |
|---|---|
| Landing page | `src/app/(marketing)/` |
| Auth (sign in / sign up) | `src/app/(auth)/` |
| Dashboard | `src/app/dashboard/` |
| Widget loader (vanilla JS) | `public/widget.js` |
| Widget page (rendered in the iframe) | `src/app/embed/[publicKey]/` |
| RAG pipeline | `src/lib/ai/` |
| Plans, limits and gated features | `src/lib/plans.ts` |
| Database schema | `supabase/migrations/0001_init.sql` |

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + pgvector + Auth) ·
Gemini for both answers and embeddings · Stripe (test mode) · Tailwind v4.

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the whole of
   `supabase/migrations/0001_init.sql`, and run it. This creates the tables,
   the `vector` extension, row-level security policies, the vector-search
   function and the usage meter.
3. Under **Authentication → Providers → Email**, turn **Confirm email** off for
   a smoother demo. (If you leave it on, signup shows a "check your inbox"
   message instead of signing you straight in — both paths work.)
4. Copy the values from **Project Settings → API**.

### 2. Gemini key

One key covers both answers and embeddings: [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
The free tier needs no card. It does enforce per-minute rate limits — the
embedding client batches and backs off to stay under them, but a very large
document will be slower than on a paid tier.

### 3. Stripe (test mode)

1. In the Stripe dashboard, switch **Test mode** on.
2. Create two recurring products — Pro ($29/month) and Business ($99/month) —
   and copy each **price** id (`price_...`).
3. Copy your secret key from **Developers → API keys**.
4. Run the webhook forwarder and copy the signing secret it prints:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 4. Environment

```bash
cp .env.example .env.local
```

Fill in every value. `SUPABASE_SERVICE_ROLE_KEY` is server-only — it bypasses
row-level security and must never reach the browser.

### 5. Run

```bash
npm install && npm run dev
```

Open <http://localhost:3000>.

---

## Trying it end to end

1. **Sign up** at `/signup`.
2. **Create an assistant** and give it the business's name.
3. **Upload a document** — a price list PDF works best. Watch it go from
   *processing* to *ready* as it's chunked and embedded.
4. **Test it** on the *Test it* tab. Ask something the document covers, then
   ask something it doesn't — the second answer should decline rather than
   guess.
5. **Install it**: copy the snippet from the *Install* tab, then open
   `http://localhost:3000/demo-site.html?bot=YOUR_PUBLIC_KEY`. That page is a
   stand-in customer website; the widget mounts in the corner exactly as it
   would on a real site.
6. **Upgrade**: go to *Billing*, pick Pro, and pay with card
   `4242 4242 4242 4242` (any future expiry, any CVC). Once the webhook fires,
   the branding disappears from the widget and the colour picker, lead capture
   and domain allowlist unlock.

---

## How answering works

```
question
  → embed as RETRIEVAL_QUERY (gemini-embedding-2, 1536 dims)
  → match_chunks() cosine search in pgvector, filtered to this bot
  → drop matches below 0.60 similarity
  → prompt Gemini with the surviving passages and a strict "only these" rule
  → stream deltas to the client over SSE
  → persist both turns; flag the answer if the model emitted [[NO_ANSWER]]
```

Three things make the "never invents a price" claim hold:

- **Retrieval is filtered, but deliberately not strictly.** The floor was set by
  measuring the live pipeline, not copied from a tutorial. Gemini's similarity
  scores sit in a narrow band — a directly relevant passage scores ~0.78-0.84
  and an unrelated one ~0.60 — so a tight floor backfires: at 0.70 a genuine
  question about opening hours scored 0.638 and was refused even though the
  answer was in the retrieved text. Retrieval stays permissive and the prompt
  does the guarding.
- **Questions and documents are embedded differently.** `RETRIEVAL_QUERY` for
  the question, `RETRIEVAL_DOCUMENT` for stored chunks. Gemini maps them into a
  shared space tuned for asymmetric search, so a short question lands near the
  long passage that answers it.
- **The refusal is machine-readable.** The model emits a sentinel token when it
  can't answer from the passages. It's stripped before display and drives both
  the lead-capture prompt and the `unanswered` flag on the stored message.

Both claims are checked rather than asserted:

```bash
npm run check:ai
```

That script runs the real pipeline against the live database — ingests a sample
price list, asks a question the document answers, one it answers indirectly, and
one it doesn't cover — then asserts the assistant answers the first two and
refuses the third. It prints the similarity scores and cleans up after itself.

## Plans and gating

`src/lib/plans.ts` is the single source of truth for every limit and feature
flag. The UI reads it to render the pricing table; the API routes read it to
enforce. Nothing is gated in the client only:

| | Free | Pro $29 | Business $99 |
|---|---|---|---|
| Assistants | 1 | 3 | 10 |
| Documents each | 3 | 100 | 1,000 |
| Answers / month | 50 | 2,000 | 10,000 |
| Remove branding | — | ✓ | ✓ |
| Brand colour | — | ✓ | ✓ |
| Lead capture | — | ✓ | ✓ |
| Domain allowlist | — | ✓ | ✓ |
| Import from URL | — | — | ✓ |
| Model | Flash | Flash | Pro |

The monthly quota is enforced in Postgres (`try_consume_message`) under a row
lock, so concurrent widget traffic can't overshoot it.

---

## Tenancy and security

Every table is protected by row-level security, so a signed-in user can only
reach their own rows. The subtle part is the two `SECURITY DEFINER` functions —
vector search and the usage meter — which by design bypass RLS.

Postgres grants `EXECUTE` on new functions to `PUBLIC`, and the Supabase anon
key ships inside the browser bundle. That combination meant anyone holding a bot
id could call the vector search directly and read another tenant's entire
knowledge base, or increment another account's message counter. Migration
`0002` revokes both from `anon` and `authenticated` and grants them to the
service role alone; every caller now reaches them through a server route that
has already established which bot the request may touch.

```bash
npm run check:security
```

That script attacks the live database with the anon key — the same credential
every visitor already has — and fails loudly if any tenant data comes back.

The URL importer is also treated as a request-forgery surface: it refuses
loopback, private and link-local addresses, and re-checks every redirect hop
rather than trusting the first URL.

## Known limits

Called out rather than hidden — this is an MVP:

- **Ingestion runs inside the request.** A very large PDF can take a while to
  upload. A production build would move chunk-and-embed to a queue.
- **Rate limiting is in-process.** `src/lib/rate-limit.ts` is a per-instance
  fixed window, so on a multi-instance deploy the effective limit multiplies.
  The hard cost ceiling is the per-account monthly quota in Postgres. Swap in
  Redis for an exact global limit.
- **The Gemini free tier has a daily cap, and it is low.** Free keys allow
  roughly 1000 requests a day on the flash-lite models the standard tiers use,
  but only 20 a day on the flagship flash model the Business tier uses. Quotas
  reset at midnight Pacific and count per project, not per key. Ingestion also
  hits a separate per-minute limit; the client retries with backoff — patiently
  for uploads, briefly for chat, since a visitor will not wait out a rate-limit
  window. Enabling billing on the Google Cloud project removes all of this for
  cents.
- **The domain allowlist is a deterrent, not a security boundary.** It checks
  `Origin` and `Referer`, which browsers set honestly but a scripted client can
  forge. The knowledge base is the business's own public FAQ, so the real abuse
  protection is the rate limiter plus the quota.
- **Scanned PDFs aren't supported.** There's no OCR, so a PDF with no text
  layer fails with a message saying exactly that.
- **No team seats.** One login per account.

## Deploying

Works on Vercel as-is. Set the same environment variables, point
`NEXT_PUBLIC_APP_URL` at the deployed origin (the widget snippet is built from
it), and add a Stripe webhook endpoint for
`https://your-domain/api/stripe/webhook` listening to
`checkout.session.completed` and `customer.subscription.*`.
