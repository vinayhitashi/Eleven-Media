import type { Platform } from "@/lib/types";
import { PLATFORM_META } from "@/platforms/meta";
import { cn } from "@/lib/utils";

/** Neutral platform chip: coloured identity dot + label (never colour alone). */
export function PlatformBadge({ platform, className, compact }: { platform: Platform; className?: string; compact?: boolean }) {
  const meta = PLATFORM_META[platform];
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-full border border-border bg-surface px-2 text-[11.5px] font-medium text-muted", className)}>
      <span className="size-1.5 rounded-full" style={{ background: meta.color }} aria-hidden />
      {compact ? meta.short : meta.label}
    </span>
  );
}
