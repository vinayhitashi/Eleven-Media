import type { AccountDailyResult, ContentHistoryPoint, ContentMetricsResult } from "../types";
import type { YouTubeVideoItem } from "./content-parser";

/** Parses a numeric string; absent/hidden values stay null (never 0). */
export function toCount(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Public statistics from the YouTube Data API.
 * - likeCount is absent when the owner hides likes → null
 * - commentCount is absent when comments are disabled → null
 * - shares and subscribers are NOT part of public statistics → null
 */
export function parsePublicStatistics(item: YouTubeVideoItem): ContentMetricsResult {
  return {
    contentId: item.id,
    views: toCount(item.statistics?.viewCount),
    likes: toCount(item.statistics?.likeCount),
    comments: toCount(item.statistics?.commentCount),
    shares: null,
    followersGained: null,
    source: "youtube_data_api",
  };
}

/** YouTube Analytics API `reports.query` response. */
export interface AnalyticsReport {
  columnHeaders?: { name: string; columnType?: string; dataType?: string }[];
  rows?: (string | number)[][];
}

/** Converts a report into row objects keyed by column name. */
export function reportRows(report: AnalyticsReport): Record<string, string | number>[] {
  const headers = report.columnHeaders?.map((h) => h.name) ?? [];
  return (report.rows ?? []).map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i]!])));
}

export type VideoAnalytics = { shares: number | null; subscribersGained: number | null; views: number | null; likes: number | null; comments: number | null };

/**
 * Per-video lifetime metrics from the Analytics API (dimension=video).
 * Only available for videos owned by the authorised channel. Returns a map by video id.
 */
export function parseVideoAnalytics(report: AnalyticsReport): Map<string, VideoAnalytics> {
  const out = new Map<string, VideoAnalytics>();
  for (const r of reportRows(report)) {
    const id = String(r.video ?? "");
    if (!id) continue;
    out.set(id, {
      shares: toCount(r.shares as number | undefined),
      subscribersGained: toCount(r.subscribersGained as number | undefined),
      views: toCount(r.views as number | undefined),
      likes: toCount(r.likes as number | undefined),
      comments: toCount(r.comments as number | undefined),
    });
  }
  return out;
}

/** Channel daily report (dimension=day) → account daily results. */
export function parseChannelDaily(report: AnalyticsReport): AccountDailyResult[] {
  return reportRows(report)
    .filter((r) => typeof r.day === "string")
    .map((r) => ({
      date: String(r.day),
      followersGained: toCount(r.subscribersGained as number | undefined),
      followersLost: toCount(r.subscribersLost as number | undefined),
      views: toCount(r.views as number | undefined),
    }));
}

/**
 * Merge public stats (fresh, near-real-time) with Analytics (authoritative for
 * shares & attributed subscribers, but ~48h delayed).
 */
export function mergeVideoMetrics(
  publicStats: ContentMetricsResult | undefined,
  analytics: VideoAnalytics | undefined,
  contentId: string,
): ContentMetricsResult {
  return {
    contentId,
    views: publicStats?.views ?? analytics?.views ?? null,
    likes: publicStats?.likes ?? analytics?.likes ?? null,
    comments: publicStats?.comments ?? analytics?.comments ?? null,
    shares: analytics?.shares ?? null,
    followersGained: analytics?.subscribersGained ?? null,
    source: analytics ? "youtube_data_api+youtube_analytics_api" : "youtube_data_api",
  };
}

/**
 * Rebuilds end-of-day CUMULATIVE values for one video from the Analytics API's
 * per-day report and its lifetime totals:
 *
 *   cumulative(end of day d) = lifetime − Σ daily values after d
 *
 * Both inputs come from the same official source, so the history is exact
 * (within the API's own reporting), not an estimate. Metrics missing from the
 * lifetime totals stay null.
 */
export function cumulativeHistory(contentId: string, report: AnalyticsReport, lifetime: VideoAnalytics): ContentHistoryPoint[] {
  const rows = reportRows(report)
    .filter((r) => typeof r.day === "string")
    .sort((a, b) => (String(a.day) < String(b.day) ? -1 : 1));
  const keys = [
    ["views", "views"],
    ["likes", "likes"],
    ["comments", "comments"],
    ["shares", "shares"],
    ["subscribersGained", "followersGained"],
  ] as const;
  const running: Record<string, number | null> = {
    views: lifetime.views,
    likes: lifetime.likes,
    comments: lifetime.comments,
    shares: lifetime.shares,
    subscribersGained: lifetime.subscribersGained,
  };
  const out: ContentHistoryPoint[] = [];
  // Walk backwards from the most recent day.
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]!;
    const point: ContentHistoryPoint = { contentId, date: String(r.day), views: null, likes: null, comments: null, shares: null, followersGained: null };
    for (const [src, dst] of keys) {
      const cur = running[src];
      point[dst] = cur === null || cur === undefined ? null : Math.max(0, cur);
      const dayVal = toCount(r[src] as number | undefined);
      if (cur !== null && cur !== undefined && dayVal !== null) running[src] = cur - dayVal;
    }
    out.push(point);
  }
  return out.reverse();
}
