"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import { PLATFORMS } from "@/lib/types";
import { PLATFORM_META } from "@/platforms/meta";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PRESETS = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "3M" },
] as const;

/** Date range + dimension filters, all in one row above the charts; state lives in the URL. */
export function FilterBar({
  range,
  from,
  to,
  clients,
  clientId,
  showPlatform,
  platform,
}: {
  range: string;
  from: string;
  to: string;
  clients?: { id: string; name: string }[];
  clientId?: string | null;
  showPlatform?: boolean;
  platform?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [customOpen, setCustomOpen] = useState(range === "custom");
  const [cFrom, setFrom] = useState(from);
  const [cTo, setTo] = useState(to);

  const push = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const selectCls =
    "h-9 rounded-lg border border-border-strong bg-surface pl-3 pr-8 text-[13px] text-fg hover:border-[var(--ring)] focus:outline-none appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23898781' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_10px_center] bg-no-repeat";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {clients ? (
        <select aria-label="Client" className={selectCls} value={clientId ?? ""} onChange={(e) => push({ client: e.target.value || null })}>
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      ) : null}
      {showPlatform ? (
        <select aria-label="Platform" className={selectCls} value={platform ?? ""} onChange={(e) => push({ platform: e.target.value || null })}>
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{PLATFORM_META[p].label}</option>
          ))}
        </select>
      ) : null}

      <div role="radiogroup" aria-label="Date range" className="inline-flex h-9 items-center rounded-lg border border-border-strong bg-surface p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={range === p.value}
            onClick={() => {
              setCustomOpen(false);
              push({ range: p.value, from: null, to: null });
            }}
            className={cn(
              "h-full rounded-md px-3 text-[12.5px] font-medium text-muted transition-colors hover:text-fg",
              range === p.value && "bg-accent text-accent-fg hover:text-accent-fg",
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={range === "custom"}
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "flex h-full items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium text-muted transition-colors hover:text-fg",
            range === "custom" && "bg-accent text-accent-fg hover:text-accent-fg",
          )}
        >
          <CalendarRange className="size-3.5" /> Custom
        </button>
      </div>
      {customOpen ? (
        <form
          className="flex flex-wrap items-center gap-2 animate-fade-in"
          onSubmit={(e) => {
            e.preventDefault();
            if (cFrom && cTo) push({ range: "custom", from: cFrom, to: cTo });
          }}
        >
          <input type="date" aria-label="From" value={cFrom} max={cTo || undefined} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-border-strong bg-surface px-2.5 text-[13px]" />
          <span className="text-subtle">→</span>
          <input type="date" aria-label="To" value={cTo} min={cFrom || undefined} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-border-strong bg-surface px-2.5 text-[13px]" />
          <Button type="submit" size="sm" variant="secondary">Apply</Button>
        </form>
      ) : null}
      {pending ? <Loader2 className="size-4 animate-spin text-subtle" aria-label="Loading" /> : null}
    </div>
  );
}
