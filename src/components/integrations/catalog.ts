import "server-only";
import { allAdapters } from "@/platforms/registry";
import type { PlatformCatalogItem } from "./connect-card";

/** Serialisable view of the adapter registry for the UI. */
export function platformCatalog(): PlatformCatalogItem[] {
  return allAdapters().map((a) => {
    const s = a.status === "available" ? a.metricSupport : ((a as unknown as { plannedSupport?: typeof a.metricSupport }).plannedSupport ?? a.metricSupport);
    return {
      id: a.id,
      label: a.label,
      status: a.status,
      apis: a.apis,
      configured: a.auth?.isConfigured() ?? false,
      support: [
        { label: "Views", ok: s.views },
        { label: "Likes", ok: s.likes },
        { label: "Comments", ok: s.comments },
        { label: "Shares", ok: s.shares },
        { label: "Daily followers", ok: s.accountFollowersDaily },
        { label: "Follows per post", ok: s.followersAttributed },
      ],
    };
  });
}
