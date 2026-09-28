import type { ParsedContentUrl } from "./types";
import { parseYouTubeUrl } from "./youtube/content-parser";
import { parseInstagramUrl } from "./instagram/content-parser";
import { parseTikTokUrl } from "./tiktok/content-parser";
import { parseFacebookUrl } from "./facebook/content-parser";
import { parseLinkedInUrl } from "./linkedin/content-parser";

/**
 * Client-safe platform detection (pure URL parsing, no API code) — used for the
 * live preview when pasting a link, and by the server registry.
 */
const parsers = [parseYouTubeUrl, parseInstagramUrl, parseTikTokUrl, parseFacebookUrl, parseLinkedInUrl];

export function detectContentUrl(url: string): ParsedContentUrl | null {
  if (!url.trim()) return null;
  for (const parse of parsers) {
    const r = parse(url);
    if (r) return r;
  }
  return null;
}
