import type { ParsedContentUrl } from "../types";
import { hostMatches, safeUrl } from "../stub";

/** linkedin.com/posts/{slug}-activity-{id}-xxxx or /feed/update/urn:li:{activity|share|ugcPost}:{id}. */
export function parseLinkedInUrl(raw: string): ParsedContentUrl | null {
  const url = safeUrl(raw);
  if (!url || !hostMatches(url, ["linkedin.com", "lnkd.in"])) return null;
  const path = decodeURIComponent(url.pathname);
  const urn = /urn:li:(activity|share|ugcPost):(\d+)/.exec(path);
  if (urn) return { platform: "linkedin", contentId: `urn:li:${urn[1]}:${urn[2]}`, url: url.toString(), contentType: "post" };
  const act = /-activity-(\d+)-/.exec(path);
  if (act) return { platform: "linkedin", contentId: `urn:li:activity:${act[1]}`, url: url.toString(), contentType: "post" };
  return { platform: "linkedin", contentId: null, url: url.toString(), contentType: null };
}
