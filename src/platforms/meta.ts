import type { Platform } from "@/lib/types";

/** Client-safe platform presentation data (no API code). Colours follow the entity, in fixed order. */
export const PLATFORM_META: Record<Platform, { label: string; color: string; short: string }> = {
  youtube: { label: "YouTube", color: "var(--series-1)", short: "YT" },
  instagram: { label: "Instagram", color: "var(--series-2)", short: "IG" },
  tiktok: { label: "TikTok", color: "var(--series-3)", short: "TT" },
  facebook: { label: "Facebook", color: "var(--series-4)", short: "FB" },
  linkedin: { label: "LinkedIn", color: "var(--series-5)", short: "IN" },
};
