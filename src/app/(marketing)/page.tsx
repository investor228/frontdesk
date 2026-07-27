import Link from "next/link";
import {
  Clock,
  FileUp,
  Globe,
  Lock,
  Mail,
  MessageSquareOff,
  Paintbrush,
  Quote,
  ShieldCheck,
  Sparkles,
  Code2,
} from "lucide-react";
import { DemoChat } from "@/components/marketing/demo-chat";
import { PlanCards } from "@/components/plan-cards";
import { LinkButton } from "@/components/ui";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <ForWho />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}

/* ── Hero ───────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft brand wash instead of the usual purple gradient slab. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-[radial-gradient(60%_60%_at_50%_40%,var(--color-brand-100),transparent_70%)] opacity-70"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_auto] lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Sparkles className="size-3.5" />
            For salons, studios, clinics and local services
          </span>

          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] text-ink sm:text-5xl lg:text-[3.4rem]">
            Your customers ask the same five questions.
            <br className="hidden sm:block" />
            <span className="text-brand-700"> Answer them once.</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Upload the price list, hours and policies you already have. Frontdesk
            turns them into a chat assistant on your website that answers
            customers at 11pm on a Sunday — using your documents and nothing else.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton href="/signup" size="lg">
              Start free — no card
            </LinkButton>
            <a
              href="#how"
              className="inline-flex h-12 items-center px-2 text-sm font-medium text-muted transition hover:text-ink"
            >
              See how it works
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {[
              "Set up in ten minutes",
              "One line of code",
              "Never invents a price",
            ].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-brand-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center lg:justify-end">
          <DemoChat />
        </div>
      </div>
    </section>
  );
}

/* ── Problem ────────────────────────────────────────────── */

function Problem() {
  const points = [
    {
      icon: Clock,
      title: "The messages arrive after closing",
      body: "Most people look you up in the evening. By the time you reply the next morning, they've booked with whoever answered first.",
    },
    {
      icon: Quote,
      title: "It's the same five questions",
      body: "How much. How long. Do I need to book. Where are you. Are you open Sunday. You've typed those answers a thousand times.",
    },
    {
      icon: MessageSquareOff,
      title: "A generic chatbot makes it worse",
      body: "A bot that invents a price you don't charge costs you more than no bot at all. Yours must only say what you've written down.",
    },
  ];

  return (
    <section className="border-y border-line bg-raised py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2 className="max-w-2xl text-3xl font-semibold text-ink sm:text-4xl">
          You&apos;re losing bookings to a question you&apos;ve already answered.
        </h2>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {points.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <span className="grid size-10 place-items-center rounded-xl bg-sand-100 text-brand-700">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How it works ───────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      icon: FileUp,
      title: "Upload what you already have",
      body: "Your price list as a PDF, your policies in Word, a plain-text list of hours. Drag them in — no rewriting, no filling out forms, no training a bot.",
    },
    {
      icon: Sparkles,
      title: "Ask it something",
      body: "Test it in the app the way a customer would. Every answer shows which document it came from, so you can see exactly where it's reading.",
    },
    {
      icon: Code2,
      title: "Paste one line into your site",
      body: "WordPress, Tilda, Wix, Webflow, Shopify — anywhere you can add a script tag. The chat bubble appears in the corner and starts working.",
    },
  ];

  return (
    <section id="how" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold text-ink sm:text-4xl">
            Ten minutes, start to finish
          </h2>
          <p className="mt-3 text-lg text-muted">
            There&apos;s no bot to train and no conversation tree to draw. If you
            can attach a file to an email, you can do this.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="rounded-[var(--radius-card)] border border-line bg-raised p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-600 text-white">
                  <Icon className="size-4.5" />
                </span>
                <span className="font-display text-sm font-medium text-faint">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Features ───────────────────────────────────────────── */

function Features() {
  const features = [
    {
      icon: ShieldCheck,
      title: "It answers from your documents only",
      body: "If the answer isn't in what you uploaded, it says so instead of guessing. Prices, hours and policies come out exactly as you wrote them.",
      wide: true,
    },
    {
      icon: Quote,
      title: "Every answer cites its source",
      body: "You see which file each answer came from, so a wrong answer means a wrong document — and you know which one to fix.",
    },
    {
      icon: Mail,
      title: "Turns a dead end into a lead",
      body: "When it can't answer, it asks for the visitor's email and hands you the question. You follow up instead of losing them.",
    },
    {
      icon: Paintbrush,
      title: "Looks like it belongs to you",
      body: "Set the accent colour, the greeting and the tone. On paid plans the Frontdesk badge comes off entirely.",
    },
    {
      icon: Globe,
      title: "Doesn't break your site",
      body: "The widget runs in an isolated frame, so your CSS can't leak in and it can't leak out. It loads asynchronously and adds one element to the page.",
    },
    {
      icon: Lock,
      title: "Locked to your domains",
      body: "Restrict the widget to the sites you own so nobody can lift your snippet and burn through your quota.",
    },
  ];

  return (
    <section id="features" className="scroll-mt-20 border-y border-line bg-raised py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold text-ink sm:text-4xl">
            Built to be trusted with your prices
          </h2>
          <p className="mt-3 text-lg text-muted">
            The hard part of a customer-facing bot isn&apos;t answering. It&apos;s
            not making things up.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body, wide }) => (
            <div
              key={title}
              className={[
                "rounded-[var(--radius-card)] border border-line p-6",
                wide
                  ? "bg-brand-600 text-white md:col-span-2 lg:col-span-1"
                  : "bg-surface",
              ].join(" ")}
            >
              <Icon className={wide ? "size-5 text-brand-100" : "size-5 text-brand-600"} />
              <h3
                className={[
                  "mt-4 text-lg font-semibold",
                  wide ? "text-white" : "text-ink",
                ].join(" ")}
              >
                {title}
              </h3>
              <p
                className={[
                  "mt-2 leading-relaxed",
                  wide ? "text-brand-100" : "text-muted",
                ].join(" ")}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Who it's for ───────────────────────────────────────── */

function ForWho() {
  const cases = [
    {
      who: "Beauty salons & barbers",
      asked: "“How much for balayage on long hair?”",
      answer: "Reads the price list and quotes the right tier, every time.",
    },
    {
      who: "Fitness & yoga studios",
      asked: "“Can I drop in without a membership?”",
      answer: "Quotes your actual drop-in rate and class times.",
    },
    {
      who: "Dental & medical clinics",
      asked: "“Do you take my insurance?”",
      answer: "Answers from your accepted-providers document — or says it'll check.",
    },
    {
      who: "Repair & home services",
      asked: "“Do you come out to my area?”",
      answer: "Checks your coverage list before promising anything.",
    },
  ];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2 className="max-w-2xl text-3xl font-semibold text-ink sm:text-4xl">
          If people phone you to ask a price, this is for you
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {cases.map((item) => (
            <div
              key={item.who}
              className="rounded-[var(--radius-card)] border border-line bg-raised p-5"
            >
              <p className="text-sm font-semibold text-brand-700">{item.who}</p>
              <p className="mt-2.5 text-ink">{item.asked}</p>
              <p className="mt-1.5 text-sm text-muted">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ────────────────────────────────────────────── */

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-y border-line bg-raised py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold text-ink sm:text-4xl">
            Priced like a tool, not a headcount
          </h2>
          <p className="mt-3 text-lg text-muted">
            Start on Free and connect it to your real site. Upgrade when the
            answers start replacing phone calls.
          </p>
        </div>

        <div className="mt-12">
          <PlanCards mode="marketing" />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          All plans include the widget, source citations and unlimited visitors.
          Cancel any time from the billing portal.
        </p>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────── */

function Faq() {
  const faqs = [
    {
      q: "What if it doesn't know the answer?",
      a: "It says so. The assistant is instructed to answer only from your uploaded documents, and to never fill a gap from general knowledge — prices and hours especially. On paid plans it then offers to take the visitor's email so you can follow up yourself.",
    },
    {
      q: "Do I have to write anything?",
      a: "No. Upload the files you already send customers — a price list PDF, a Word document with your policies, a text file of your opening hours. If you'd rather paste text, that works too.",
    },
    {
      q: "Where do I put the code?",
      a: "Anywhere you can add a script tag: WordPress, Tilda, Wix, Webflow, Shopify, or a hand-written site. It's one line, it goes before the closing body tag, and the install page has step-by-step notes for each platform.",
    },
    {
      q: "Will it slow down or break my website?",
      a: "The widget loads asynchronously and renders inside an isolated frame. Your styles can't affect it and it can't affect yours — which is the usual reason embedded chat widgets look broken.",
    },
    {
      q: "What happens when I change my prices?",
      a: "Delete the old document, upload the new one. The assistant reads from the new file immediately — there's nothing to retrain and no snippet to re-paste.",
    },
    {
      q: "What counts as an answer?",
      a: "Every reply the assistant generates, whether it's on your live site or in the test window. Visitors browsing without asking anything cost nothing.",
    },
    {
      q: "Can I use it in a language other than English?",
      a: "Yes. The assistant replies in whatever language the visitor writes in, as long as your documents cover the answer.",
    },
  ];

  return (
    <section id="faq" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <h2 className="text-3xl font-semibold text-ink sm:text-4xl">
          Questions we get asked
        </h2>

        <dl className="mt-10 divide-y divide-line border-y border-line">
          {faqs.map(({ q, a }) => (
            <div key={q} className="py-5">
              <dt className="font-semibold text-ink">{q}</dt>
              <dd className="mt-2 leading-relaxed text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ── Final CTA ──────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="border-t border-line bg-brand-800 py-20 text-white">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <h2 className="text-3xl font-semibold sm:text-4xl">
          Put your price list to work tonight
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
          One assistant, three documents and 50 answers a month, free. No card,
          no sales call — upload a file and ask it something.
        </p>
        <div className="mt-8 flex justify-center">
          <LinkButton
            href="/signup"
            size="lg"
            className="bg-white text-brand-800 hover:bg-brand-50"
          >
            Create your assistant
          </LinkButton>
        </div>
        <p className="mt-4 text-sm text-brand-200">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
