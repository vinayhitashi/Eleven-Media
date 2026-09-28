import Link from "next/link";
import { cn, formatCompact } from "@/lib/utils";

export interface BarListItem {
  key: string;
  label: React.ReactNode;
  value: number | null;
  display?: string;
  sub?: React.ReactNode;
  color?: string;
  href?: string;
}

/** Ranked horizontal bars with direct labels (no legend needed; values always shown as text). */
export function BarList({ items, emptyLabel = "No data yet" }: { items: BarListItem[]; emptyLabel?: string }) {
  const max = Math.max(0, ...items.map((i) => i.value ?? 0));
  if (!items.length) return <p className="py-6 text-center text-[13px] text-subtle">{emptyLabel}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const pct = item.value !== null && max > 0 ? Math.max(1.5, (item.value / max) * 100) : 0;
        const body = (
          <div className="group">
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate font-medium text-fg group-hover:underline group-hover:underline-offset-4">{item.label}</span>
              <span className={cn("shrink-0 tabular", item.value === null ? "text-[12px] text-subtle" : "font-medium text-fg")}>
                {item.display ?? formatCompact(item.value)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: item.color ?? "var(--chart-ink)" }} />
            </div>
            {item.sub ? <div className="mt-1 text-[11.5px] text-subtle">{item.sub}</div> : null}
          </div>
        );
        return <li key={item.key}>{item.href ? <Link href={item.href}>{body}</Link> : body}</li>;
      })}
    </ul>
  );
}
