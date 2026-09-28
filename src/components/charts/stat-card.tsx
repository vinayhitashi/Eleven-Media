import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { cn, formatSignedPercent } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  deltaLabel = "vs previous period",
  hint,
  partial,
  unavailable,
  className,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  hint?: string;
  partial?: boolean;
  unavailable?: boolean;
  className?: string;
}) {
  const up = (delta ?? 0) > 0;
  const flat = delta === 0;
  return (
    <div className={cn("group rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-[var(--accent-glow)] sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-muted">{label}</span>
        {hint ? (
          <span title={hint} className="text-subtle opacity-60 transition-opacity group-hover:opacity-100">
            <Info className="size-3.5" aria-label={hint} />
          </span>
        ) : null}
      </div>
      <div className={cn("mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em] text-fg", unavailable && "text-[15px] font-medium tracking-normal text-subtle")}>
        {partial && !unavailable ? <span className="mr-0.5 align-top text-[15px] text-subtle" title="Lower bound: some content had no earlier snapshot">≥</span> : null}
        {value}
      </div>
      <div className="mt-2.5 flex h-5 items-center gap-1.5 text-[12px]">
        {delta === undefined ? null : delta === null ? (
          <span className="text-subtle">— {deltaLabel}</span>
        ) : (
          <>
            <span className={cn("inline-flex items-center gap-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 font-medium tabular", flat ? "bg-surface-2 text-muted" : up ? "bg-good-bg text-good" : "bg-bad-bg text-bad")}>
              {flat ? null : up ? <ArrowUpRight className="size-3" aria-hidden /> : <ArrowDownRight className="size-3" aria-hidden />}
              {formatSignedPercent(delta)}
            </span>
            <span className="truncate text-subtle">{deltaLabel}</span>
          </>
        )}
      </div>
    </div>
  );
}
