import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="px-6 py-5">
        <Link href="/" className="font-display text-lg font-semibold text-ink">
          Frontdesk
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-20 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
