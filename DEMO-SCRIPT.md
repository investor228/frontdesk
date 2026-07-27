# Frontdesk — video demo script

Target length: **6–7 minutes**. Scene-by-scene: what is on screen, what you say.
The English column is the voiceover — read it out loud, it is written to be
spoken, not to be read silently.

---

## Before you hit record

| | |
|---|---|
| **Warm the app up** | Open the live site, ask the bot one throwaway question, then close it. The first request after idle is a cold start and takes a few seconds — you do not want that on tape. |
| **Have the price list ready** | A PDF or TXT on the desktop, one click from the upload box. |
| **Fresh account** | Sign up on camera with a new email so the reviewer sees the real first-run path. |
| **Browser** | Incognito, no extensions. Bitdefender and password managers inject attributes and can trigger dev warnings. |
| **Tabs pre-opened** | Stripe dashboard, GitHub repo, Vercel deployments, a Telegram/Slack chat with yourself. Pre-open them so you switch, not load. |
| **Do NOT show on screen** | `.env.local`, the Vercel "reveal value" button, your Stripe secret key. Names of variables are fine, values are not. |
| **Pace the questions** | Wait for each answer to finish before asking the next. The free Gemini tier rate-limits bursts as well as capping the day. |
| **Watch the daily quota** | Free keys allow ~1000 answers a day on the standard tiers, but only ~20 on the flagship model the Business tier uses. Don't rehearse on a Business-plan account the same day you record. Quotas reset at midnight Pacific. |
| **Rehearse without burning takes** | `npx tsx --env-file=.env.local demo-assets/rehearse.mts` runs every scripted question against the real PDF and prints the answers, so you know exactly what will appear on camera. |
| **Terminal ready** | Font size up to ~16pt, sitting in the project folder, screen cleared. |

---

## Scene 1 — The problem (45 sec)

**On screen:** landing page hero, scrolling slowly to the three problem cards.

> Hi. This is Frontdesk — a tool that turns a business's own documents into a
> chat assistant for their website.
>
> I built it for local service businesses: salons, studios, clinics. These
> businesses get the same five questions every day. How much. How long. Are you
> open Sunday. And most of those messages arrive in the evening, after they've
> closed. By the morning the customer has booked somewhere else.
>
> A generic chatbot makes that worse, not better. If it invents a price the
> business doesn't charge, that costs more than having no bot at all. So the
> whole product is built around one promise: it answers only from your
> documents, and when it doesn't know, it says so.

**Направление:** не торопись. Первые тридцать секунд решают, слушают тебя дальше или нет. Скролль медленно, дай прочитать заголовки.

---

## Scene 2 — Sign up and create an assistant (40 sec)

**On screen:** `/signup`, fill the form, land on the empty dashboard, create a bot.

> Signing up takes one screen. No credit card on the free plan.
>
> I'll create an assistant for a beauty studio. That's it — it's ready for
> documents.

**Направление:** молчи, пока грузится. Не заполняй паузу словами «так, сейчас загрузится».

---

## Scene 3 — Upload the knowledge (45 sec)

**On screen:** knowledge base tab, drag the price list in, watch it turn *ready*.

> Now I give it what the business already has. This is just their price list —
> nothing was rewritten for the bot, no forms to fill in, no conversation tree
> to draw.
>
> Behind this, the document gets split into small sections, each one turned into
> a vector, and stored in Postgres with pgvector. Small sections on purpose —
> a price list is a page where every paragraph is a different topic, and one big
> chunk matches nothing well.

**Направление:** фраза про мелкие куски — первый момент, где ты показываешь инженерное мышление. Скажи её спокойно, как факт, а не как хвастовство.

---

## Scene 4 — The two questions that matter (75 sec)

**On screen:** the Test it tab. Ask the answerable question. Then the one the
document does not cover.

> Let me ask it something the price list covers.

*(pause — let the answer stream in fully)*

> Right — and notice it cites the document underneath. If the answer is ever
> wrong, you know which file to fix.
>
> But this next one is the part I actually care about. I'm going to ask
> something the document says nothing about.

*(pause — let the refusal land)*

> It refuses. It doesn't guess, and it doesn't fall back on what the model knows
> about salons in general.
>
> That's two separate guards. Retrieval drops passages that aren't similar
> enough, and the prompt instructs the model to refuse when the passages don't
> contain the answer. I'll show you at the end that both of those are actually
> tested, not just claimed.

**Направление:** это кульминация ролика. Не комкай. После отказа сделай паузу секунды на две молча — пусть проверяющий сам осознает, что произошло.

---

## Scene 5 — The widget on a real website (60 sec)

**On screen:** Install tab → copy snippet → switch to `demo-site.html?bot=...`
→ click the bubble → ask a question.

> To put it on a website, you paste one line. That's the whole installation.
>
> This is a stand-in for a customer's site. Same snippet, and there's the
> assistant in the corner.

*(open it, ask one short question)*

> The widget renders inside an isolated frame. That matters more than it sounds:
> it means the host site's CSS can't leak in and break the chat, and our styles
> can't leak out and break their page. That's the usual reason embedded widgets
> look broken on real websites.
>
> And down here — "Powered by Frontdesk". Hold that thought.

**Направление:** «Hold that thought» — заготовка под следующую сцену. Скажи с лёгкой интонацией, это работает как крючок.

---

## Scene 6 — Billing that actually changes the product (75 sec)

**On screen:** Billing page → Upgrade to Pro → Stripe Checkout → card 4242 →
back to the app → badge flips to Pro.

> Pricing is three tiers. Free to try it on your own FAQ, Pro for a single
> business, Business for multi-location or an agency running several clients.
>
> This is Stripe in test mode — real Checkout, real webhooks, just no real
> money.

*(pay with 4242 4242 4242 4242)*

> And the plan flips to Pro.
>
> One detail worth pointing out: the redirect back from Stripe doesn't grant
> anything. The only thing that can change a plan in my database is the signed
> webhook. If you trust the redirect, anyone can upgrade themselves by visiting
> a URL.

**On screen:** back to the widget — badge gone; then settings — colour, lead
capture and domain allowlist unlocked.

> Now the branding is gone from the widget, and the paid settings unlocked —
> brand colour, lead capture, and locking the widget to your own domains.
>
> Lead capture is the one I'd keep if I could only keep one. When the assistant
> can't answer, it asks the visitor for their email instead of letting them
> leave. A dead end becomes a follow-up.

**Направление:** момент «бейдж исчез» — самый убедительный аргумент, что оплата реально меняет продукт, а не рисует галочку. Покажи виджет до и после в одном дубле, если сможешь.

---

## Scene 7 — Under the hood (90 sec)

Быстрая нарезка. По 15–20 секунд на вкладку, не задерживайся.

**Stripe dashboard** — subscription, customer, webhook deliveries with 200s.

> Here's the same subscription in Stripe. Real customer, real subscription, and
> the webhook deliveries coming back 200.

**GitHub** — repo, then the commit list.

> The code is public. The commit history is the honest version of how this got
> built, including a security fix I'll come back to.

**OG preview** — paste the link into Telegram or Slack, let the card render.

> Small thing, but it's the first thing anyone sees. Pasting the link anywhere
> gives you a proper preview card — that image is generated at build time, not
> a screenshot I uploaded.

**Vercel** — deployments list, green.

> Deployed on Vercel, straight from that repo.

**Lighthouse** — run it live on the production URL, Desktop.

> And Lighthouse on the production URL.

**Направление:** запускай Lighthouse **только на боевом адресе и в инкогнито**. На localhost нет сжатия и кеша, оценка будет заниженной. Если циферки хорошие — задержись на секунду. Если нет — не комментируй, просто иди дальше.

---

## Scene 8 — Claims that are tested (60 sec)

**On screen:** terminal, large font.

> Two last things, because "it works" is easy to say.

*(run `npm run check:ai`)*

> This runs the real pipeline against the live database. It uploads a price
> list, asks a question the document answers, asks one it doesn't, and fails if
> the assistant answers the wrong one. It also prints the similarity scores —
> that's how the threshold got picked, by measuring, not by copying a number
> from a tutorial.

*(run `npm run check:security`)*

> And this one attacks my own database using the public key — the same key that
> ships in every visitor's browser — and tries to read another tenant's
> documents.
>
> It found a real hole while I was building this. The vector search function
> runs with elevated privileges to bypass row-level security, and Postgres lets
> anyone execute new functions by default. So with a bot ID you could read
> someone else's knowledge base. It's fixed, and this check is what keeps it
> fixed.

**Направление:** это твой сильнейший момент. Большинство тестовых заданий заканчиваются на «вот, работает». Ты заканчиваешь на «вот, я это проверяю, и вот баг, который я сам нашёл и починил». Говори про найденную дыру спокойно и без извинений — это признак зрелости, а не оплошности.

---

## Scene 9 — Close (20 sec)

**On screen:** landing page again, or the widget open on the demo site.

> That's Frontdesk. Upload what you already have, paste one line into your site,
> and stop answering the same five questions.
>
> Thanks for watching.

---

## Про английский

Ты общаешься с Майклом голосом, так что база есть. Три вещи, которые заметно
улучшают звучание:

1. **Короткие предложения.** Сценарий уже так написан — не склеивай их в длинные
   через «and» и «which».
2. **Паузы вместо «эм».** Где не знаешь, что сказать, — молчи. В смонтированном
   ролике пауза читается как уверенность, «эм» — как неуверенность.
3. **Не извиняйся.** Никаких «I hope», «maybe», «sorry for my English». Ты
   показываешь работающий продукт.

Если дубль поехал — не начинай заново с нуля. Останови, сделай паузу секунды на
три (её видно на дорожке при монтаже) и переснимай с начала предложения.
