import { Check, Minus } from "lucide-react";
import type { Platform } from "@/lib/types";
import { PLATFORM_META } from "@/platforms/meta";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PlatformCatalogItem {
  id: Platform;
  label: string;
  status: "available" | "coming_soon";
  apis: string[];
  configured: boolean;
  support: { label: string; ok: boolean }[];
}

export function ConnectCard({ item, clientId, returnTo }: { item: PlatformCatalogItem; clientId?: string | null; returnTo?: string }) {
  const available = item.status === "available";
  const canConnect = available && item.configured && Boolean(clientId);
  return (
    <div className={cn("flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card", !available && "bg-surface/60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-border bg-surface-2 text-[12px] font-bold tracking-wide">
            <span style={{ color: PLATFORM_META[item.id].color }}>{PLATFORM_META[item.id].short}</span>
          </span>
          <div>
            <div className="font-semibold">{item.label}</div>
            <div className="text-[12px] text-subtle">{item.apis.join(" · ")}</div>
          </div>
        </div>
        {available ? <Badge tone="good" dot>Live</Badge> : <Badge tone="outline">Stage 3</Badge>}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
        {item.support.map((s) => (
          <li key={s.label} className={cn("flex items-center gap-1.5", s.ok ? "text-muted" : "text-subtle")}>
            {s.ok ? <Check className="size-3.5 text-good" /> : <Minus className="size-3.5" />}
            {s.label}
          </li>
        ))}
      </ul>
      <div className="mt-5 pt-1">
        {canConnect ? (
          <a href={`/api/integrations/${item.id}/connect?clientId=${clientId}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`} className={buttonClasses("primary", "md", "w-full")}>
            Connect {item.label}
          </a>
        ) : (
          <span className={buttonClasses("secondary", "md", "w-full cursor-not-allowed opacity-60")} aria-disabled>
            {!available ? "Coming soon" : !item.configured ? "Google OAuth not configured" : "Choose a client first"}
          </span>
        )}
      </div>
    </div>
  );
}
