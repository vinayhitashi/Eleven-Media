import type { Platform } from "@/lib/types";
import type { MetricSupport, ParsedContentUrl, PlatformAdapter } from "./types";

/**
 * Builds a "coming soon" adapter: URL parsing works today (so content can be
 * catalogued), but no API calls are made until the official integration ships.
 * All metrics for these platforms render as "Not available" — never estimated.
 */
export function comingSoonAdapter(opts: {
  id: Platform;
  label: string;
  apis: string[];
  plannedSupport: MetricSupport;
  parseUrl: (url: string) => ParsedContentUrl | null;
}): PlatformAdapter & { plannedSupport: MetricSupport } {
  return {
    id: opts.id,
    label: opts.label,
    status: "coming_soon",
    apis: opts.apis,
    metricSupport: { views: false, likes: false, comments: false, shares: false, followersAttributed: false, accountFollowersDaily: false },
    plannedSupport: opts.plannedSupport,
    parseUrl: opts.parseUrl,
  };
}

export function safeUrl(raw: string): URL | null {
  try {
    const t = raw.trim();
    return new URL(t.startsWith("http") ? t : `https://${t}`);
  } catch {
    return null;
  }
}

export function hostMatches(url: URL, domains: string[]) {
  const h = url.hostname.toLowerCase();
  return domains.some((d) => h === d || h.endsWith(`.${d}`));
}
