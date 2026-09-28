import type { Platform } from "@/lib/types";
import { PLATFORM_META } from "@/platforms/meta";
import { cn } from "@/lib/utils";

export function ContentThumb({ src, platform, className }: { src: string | null; platform: Platform; className?: string }) {
  return (
    <span className={cn("relative block aspect-video w-[88px] shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="grid size-full place-items-center text-[10px] font-semibold tracking-[0.12em] text-subtle">{PLATFORM_META[platform].short}</span>
      )}
      <span className="absolute bottom-1 left-1 size-1.5 rounded-full ring-2 ring-[var(--surface)]" style={{ background: PLATFORM_META[platform].color }} aria-hidden />
    </span>
  );
}
