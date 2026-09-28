import { cn } from "@/lib/utils";

/** Eleven Media monogram — two vertical strokes ("11"). */
export function Monogram({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-8 place-items-center rounded-[10px] bg-accent text-accent-fg shadow-[0_0_24px_-4px_var(--accent-glow)]", className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
        <rect x="6" y="4" width="3.2" height="16" rx="0.6" />
        <rect x="14.8" y="4" width="3.2" height="16" rx="0.6" />
      </svg>
    </span>
  );
}

export function Wordmark({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", onDark && "text-sidebar-fg", className)}>
      <Monogram />
      <span className="leading-none">
        <span className="block text-[14px] font-semibold tracking-tight">Eleven Growth</span>
        <span className={cn("mt-0.5 block text-[10.5px] uppercase tracking-[0.16em]", onDark ? "text-sidebar-muted" : "text-subtle")}>by Eleven Media</span>
      </span>
    </span>
  );
}
