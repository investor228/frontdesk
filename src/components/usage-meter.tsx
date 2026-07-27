import Link from "next/link";
import { cn } from "@/lib/utils";

/** Monthly answer quota. Turns amber past 80% and red once exhausted. */
export function UsageMeter({
  used,
  limit,
  className,
}: {
  used: number;
  limit: number;
  className?: string;
}) {
  const ratio = Math.min(used / limit, 1);
  const exhausted = used >= limit;
  const nearly = !exhausted && ratio >= 0.8;

  return (
    <Link
      href="/dashboard/billing"
      className={cn("group flex items-center gap-2", className)}
      title={`${used} of ${limit} answers used this month`}
    >
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            exhausted ? "bg-danger" : nearly ? "bg-warn" : "bg-brand-500",
          )}
          style={{ width: `${Math.max(ratio * 100, 2)}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs tabular-nums transition",
          exhausted ? "text-danger" : "text-muted group-hover:text-ink",
        )}
      >
        {used.toLocaleString()}/{limit.toLocaleString()}
      </span>
    </Link>
  );
}
