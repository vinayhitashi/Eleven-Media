import type { ParsedContentUrl } from "../types";
import { hostMatches, safeUrl } from "../stub";

/** tiktok.com/@user/video/{id} or /@user/photo/{id}. Short links (vm./vt.) carry no id. */
export function parseTikTokUrl(raw: string): ParsedContentUrl | null {
  const url = safeUrl(raw);
  if (!url || !hostMatches(url, ["tiktok.com"])) return null;
  const m = /\/(video|photo)\/(\d{8,25})/.exec(url.pathname);
  if (!m) return { platform: "tiktok", contentId: null, url: url.toString(), contentType: null };
  return { platform: "tiktok", contentId: m[2]!, url: `https://www.tiktok.com${url.pathname}`, contentType: m[1] === "photo" ? "photo" : "video" };
}
