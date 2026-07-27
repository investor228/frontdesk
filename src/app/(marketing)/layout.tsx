import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LinkButton } from "@/components/ui";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
          <Link href="/" className="font-display text-xl font-semibold text-ink">
            Frontdesk
          </Link>

          <nav className="ml-auto hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#how" className="transition hover:text-ink">
              How it works
            </a>
            <a href="#features" className="transition hover:text-ink">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-ink">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-ink">
              FAQ
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {session ? (
              <LinkButton href="/dashboard" size="sm">
                Dashboard
              </LinkButton>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-2 text-sm text-muted transition hover:text-ink"
                >
                  Sign in
                </Link>
                <LinkButton href="/signup" size="sm">
                  Start free
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-line bg-raised">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-display text-lg font-semibold text-ink">Frontdesk</p>
            <p className="mt-1 text-sm text-muted">
              The assistant that answers your customers for you.
            </p>
          </div>
          <div className="flex gap-6 text-sm text-muted">
            <a href="#pricing" className="transition hover:text-ink">
              Pricing
            </a>
            <Link href="/login" className="transition hover:text-ink">
              Sign in
            </Link>
            <Link href="/signup" className="transition hover:text-ink">
              Start free
            </Link>
          </div>
        </div>
        <div className="border-t border-line px-5 py-4 text-center text-xs text-faint sm:px-8">
          Demo product. Billing runs in Stripe test mode — no real charges.
        </div>
      </footer>
    </div>
  );
}
