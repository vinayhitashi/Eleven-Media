"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { PLATFORMS } from "@/lib/types";
import { PLATFORM_META } from "@/platforms/meta";

const selectCls =
  "h-9 rounded-lg border border-border-strong bg-surface pl-3 pr-8 text-[13px] text-fg hover:border-[var(--ring)] focus:outline-none appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23898781' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_10px_center] bg-no-repeat";

export function FilterSelects({ clients, client, platform, q }: { clients?: { id: string; name: string }[]; client?: string; platform?: string | null; q?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete("add");
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative w-full sm:w-72"
        onSubmit={(e) => {
          e.preventDefault();
          set("q", String(new FormData(e.currentTarget).get("q") ?? ""));
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
        <input name="q" defaultValue={q} placeholder="Search title or URL…" className="h-9 w-full rounded-lg border border-border-strong bg-surface pl-8 pr-3 text-[13px] placeholder:text-subtle focus:border-fg focus:outline-none" />
      </form>
      {clients ? (
        <select aria-label="Client" className={selectCls} value={client ?? ""} onChange={(e) => set("client", e.target.value)}>
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      ) : null}
      <select aria-label="Platform" className={selectCls} value={platform ?? ""} onChange={(e) => set("platform", e.target.value)}>
        <option value="">All platforms</option>
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>{PLATFORM_META[p].label}</option>
        ))}
      </select>
      {pending ? <Loader2 className="size-4 animate-spin text-subtle" /> : null}
    </div>
  );
}
