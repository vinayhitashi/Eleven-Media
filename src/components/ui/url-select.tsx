"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/** A <select> whose value lives in a URL search param. */
export function UrlSelect({ param, value, options, placeholder, label, className }: { param: string; value?: string | null; options: { value: string; label: string }[]; placeholder?: string; label: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      disabled={pending}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set(param, e.target.value);
        else next.delete(param);
        start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
      }}
      className={cn(
        "h-9 appearance-none rounded-lg border border-border-strong bg-surface bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23898781' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pl-3 pr-8 text-[13px] text-fg hover:border-[var(--ring)] focus:outline-none",
        className,
      )}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
