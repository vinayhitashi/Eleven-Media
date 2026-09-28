import type { ParsedContentUrl } from "../types";
import { hostMatches, safeUrl } from "../stub";

/** instagram.com/p/{code}, /reel/{code}, /reels/{code}, /tv/{code} → shortcode. */
export function parseInstagramUrl(raw: string): ParsedContentUrl | null {
  const url = safeUrl(raw);
  if (!url || !hostMatches(url, ["instagram.com", "instagr.am"])) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  // Optional leading username segment: /{user}/p/{code}
  const idx = parts.findIndex((p) => ["p", "reel", "reels", "tv"].includes(p));
  if (idx === -1 || !parts[idx + 1]) return { platform: "instagram", contentId: null, url: url.toString(), contentType: null };
  const kind = parts[idx]!;
  const code = parts[idx + 1]!;
  const contentType = kind === "p" ? "post" : kind === "tv" ? "video" : "reel";
  return { platform: "instagram", contentId: code, url: `https://www.instagram.com/${kind === "reels" ? "reel" : kind}/${code}/`, contentType };
}
