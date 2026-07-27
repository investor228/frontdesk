"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function BotTabs({
  botId,
  showLeads,
}: {
  botId: string;
  showLeads: boolean;
}) {
  const pathname = usePathname();
  const base = `/dashboard/bots/${botId}`;

  const tabs = [
    { href: base, label: "Knowledge" },
    { href: `${base}/playground`, label: "Test it" },
    { href: `${base}/install`, label: "Install" },
    ...(showLeads ? [{ href: `${base}/leads`, label: "Leads" }] : []),
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition",
              active
                ? "border-brand-600 font-medium text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
