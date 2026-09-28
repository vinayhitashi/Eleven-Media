import { PLATFORMS, type Platform } from "@/lib/types";
import type { PlatformAdapter } from "./types";
import { youtubeAdapter } from "./youtube";
import { instagramAdapter } from "./instagram";
import { tiktokAdapter } from "./tiktok";
import { facebookAdapter } from "./facebook";
import { linkedinAdapter } from "./linkedin";

/** Single source of truth for supported platforms. Add a platform = add an adapter here. */
const adapters: Record<Platform, PlatformAdapter> = {
  youtube: youtubeAdapter,
  instagram: instagramAdapter,
  tiktok: tiktokAdapter,
  facebook: facebookAdapter,
  linkedin: linkedinAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  return adapters[platform];
}

export function allAdapters(): PlatformAdapter[] {
  return PLATFORMS.map((p) => adapters[p]);
}

export function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
}

export { detectContentUrl } from "./detect";
