import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** First-run checklist for the agency, driven by real counts. Disappears once everything is done. */
export function GettingStarted({ counts }: { counts: { clients: number; accounts: number; content: number; reports: number } }) {
  const steps = [
    { done: counts.clients > 0, title: "Create your first client", body: "Each client gets a private workspace.", href: "/clients?new=1", cta: "Add client" },
    { done: counts.accounts > 0, title: "Connect their YouTube channel", body: "Read-only OAuth. Backfills 90 days of channel analytics.", href: "/integrations", cta: "Connect" },
    { done: counts.content > 0, title: "Track content", body: "Paste links, or import the channel’s recent uploads.", href: "/content?add=1", cta: "Add content" },
    { done: counts.reports > 0, title: "Generate a monthly report", body: "Preview, publish to the client, download as PDF.", href: "/reports?generate=1", cta: "Generate" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const next = steps.findIndex((s) => !s.done);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--accent-glow)] bg-surface p-6 shadow-glow">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,var(--accent-glow),transparent_70%)]" aria-hidden />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent-text">Getting started</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Set up your agency workspace</h2>
        </div>
        <div className="flex items-center gap-3 text-[12.5px] text-muted">
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          {doneCount}/{steps.length}
        </div>
      </div>
      <ol className="relative mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className={cn("flex flex-col rounded-xl border p-4", i === next ? "border-accent/50 bg-accent-soft" : "border-border bg-surface-2/40")}>
            <div className="flex items-center gap-2">
              {s.done ? <CheckCircle2 className="size-4 text-accent-text" /> : <span className="grid size-4 place-items-center rounded-full border border-border-strong text-[9px] font-bold text-subtle">{i + 1}</span>}
              <span className={cn("text-[13.5px] font-medium", s.done && "text-subtle line-through decoration-1")}>{s.title}</span>
            </div>
            <p className="mt-1.5 flex-1 text-[12.5px] text-subtle">{s.body}</p>
            {!s.done ? (
              <Link href={s.href} className={cn("mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold", i === next ? "text-accent-text" : "text-muted hover:text-fg")}>
                {s.cta} <ArrowRight className="size-3.5" />
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
