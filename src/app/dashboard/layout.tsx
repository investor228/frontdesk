import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { signOut } from "../(auth)/actions";
import { Badge } from "@/components/ui";
import { UsageMeter } from "@/components/usage-meter";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account, plan } = await requireSession();

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-raised/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="font-display text-lg font-semibold text-ink">
            Frontdesk
          </Link>

          <Badge tone={plan.id === "free" ? "neutral" : "brand"}>{plan.name}</Badge>

          <div className="ml-auto flex items-center gap-4">
            <UsageMeter
              used={account.messages_used}
              limit={plan.limits.messagesPerMonth}
              className="hidden sm:flex"
            />

            <Link
              href="/dashboard/billing"
              className="text-sm text-muted transition hover:text-ink"
            >
              Billing
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-muted transition hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
