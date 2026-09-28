import type { ContentDetails, ParsedContentUrl } from "../types";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

/**
 * Parses any common YouTube video URL into its 11-character video id.
 * Pure string parsing — no network, no scraping.
 */
export function parseYouTubeUrl(raw: string): ParsedContentUrl | null {
  let url: URL;
  try {
    url = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  let contentType: string = "video";

  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (parts[0] === "shorts") {
      id = parts[1] ?? null;
      contentType = "short";
    } else if (parts[0] === "live") {
      id = parts[1] ?? null;
      contentType = "live";
    } else if (parts[0] === "embed" || parts[0] === "v") id = parts[1] ?? null;
    else if (parts.length === 0 && url.searchParams.get("v")) id = url.searchParams.get("v");
    else {
      // Channel / playlist / other YouTube URL — recognised platform, no content id.
      return { platform: "youtube", contentId: null, url: url.toString(), contentType: null };
    }
  } else {
    return null;
  }

  if (!id || !VIDEO_ID.test(id)) {
    return { platform: "youtube", contentId: null, url: url.toString(), contentType: null };
  }
  const canonical = contentType === "short" ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
  return { platform: "youtube", contentId: id, url: canonical, contentType };
}

/** Shape of a `videos.list` item (subset we use). */
export interface YouTubeVideoItem {
  id: string;
  snippet?: {
    title?: string;
    publishedAt?: string;
    channelId?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url: string; width?: number; height?: number } | undefined>;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: { duration?: string };
}

export function bestThumbnail(thumbnails: NonNullable<YouTubeVideoItem["snippet"]>["thumbnails"]): string | null {
  if (!thumbnails) return null;
  for (const key of ["maxres", "standard", "high", "medium", "default"]) {
    const t = thumbnails[key];
    if (t?.url) return t.url;
  }
  return null;
}

/** ISO-8601 duration → seconds (PT1M2S → 62). */
export function durationSeconds(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const [, d, h, min, s] = m;
  return (Number(d ?? 0) * 86400) + (Number(h ?? 0) * 3600) + (Number(min ?? 0) * 60) + Number(s ?? 0);
}

export function parseVideoDetails(item: YouTubeVideoItem): ContentDetails {
  const secs = durationSeconds(item.contentDetails?.duration);
  const live = item.snippet?.liveBroadcastContent && item.snippet.liveBroadcastContent !== "none";
  return {
    contentId: item.id,
    title: item.snippet?.title ?? null,
    thumbnailUrl: bestThumbnail(item.snippet?.thumbnails),
    publishedAt: item.snippet?.publishedAt ?? null,
    accountId: item.snippet?.channelId ?? null,
    // Duration is a hint only; YouTube does not expose an explicit "is short" flag.
    contentType: live ? "live" : secs !== null && secs <= 180 ? "short" : "video",
  };
}
