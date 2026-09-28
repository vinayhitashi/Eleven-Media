import type { AccountSyncResult, ContentDetails, ContentHistoryPoint, ContentMetricsResult, SyncContext, TokenSet } from "../types";
import { analyticsApi, chunk, dataApi, publicAuth, YouTubeApiError } from "./client";
import { getAccount, getChannel } from "./auth";
import { parseVideoDetails, type YouTubeVideoItem } from "./content-parser";
import { cumulativeHistory, mergeVideoMetrics, parseChannelDaily, parsePublicStatistics, parseVideoAnalytics, type AnalyticsReport, type VideoAnalytics } from "./metrics-parser";

const YT_EPOCH = "2005-02-14"; // earliest valid startDate for lifetime Analytics queries

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function listVideos(ids: string[], accessToken: string | null): Promise<YouTubeVideoItem[]> {
  const auth = publicAuth(accessToken);
  if (!auth) throw new Error("No YouTube credentials: connect the channel via OAuth or set YOUTUBE_API_KEY for public stats.");
  const out: YouTubeVideoItem[] = [];
  for (const batch of chunk([...new Set(ids)], 50)) {
    const res = await dataApi<{ items?: YouTubeVideoItem[] }>(
      "/videos",
      { part: "snippet,statistics,contentDetails", id: batch.join(","), maxResults: 50 },
      auth,
    );
    out.push(...(res.items ?? []));
  }
  return out;
}

export async function fetchContentDetails(ids: string[], tokens: TokenSet | null): Promise<ContentDetails[]> {
  if (ids.length === 0) return [];
  return (await listVideos(ids, tokens?.accessToken ?? null)).map(parseVideoDetails);
}

/** Public statistics only (views, likes, comments). Shares/subscribers remain null. */
export async function fetchPublicMetrics(ids: string[]): Promise<ContentMetricsResult[]> {
  if (ids.length === 0) return [];
  return (await listVideos(ids, null)).map(parsePublicStatistics);
}

/**
 * Authorised sync for one connected channel:
 *  1. Channel info + current subscriber total (Data API)
 *  2. Daily channel views / subscribers gained & lost for the backfill window (Analytics API)
 *  3. Public stats for every tracked video (Data API)
 *  4. Lifetime shares + attributed subscribers per owned video (Analytics API)
 * Analytics failures degrade gracefully to "Not available" — they never become zeros.
 */
export async function syncAccount(ctx: SyncContext, opts: { contentIds: string[]; backfillDays: number; historyContentIds?: string[] }): Promise<AccountSyncResult> {
  const warnings: string[] = [];
  const token = ctx.tokens.accessToken;
  const account = await getAccount(ctx.tokens);
  if (account.platformAccountId !== ctx.platformAccountId) {
    throw new Error("The authorised Google account no longer has access to this channel. Reconnect the channel.");
  }

  const today = new Date();
  const start = new Date(today.getTime() - opts.backfillDays * 86400000);

  // 2. Channel-level daily analytics
  let daily: AccountSyncResult["daily"] = [];
  try {
    const report = await analyticsApi<AnalyticsReport>(
      {
        ids: "channel==MINE",
        startDate: isoDay(start),
        endDate: isoDay(today),
        metrics: "views,subscribersGained,subscribersLost",
        dimensions: "day",
        sort: "day",
      },
      token,
    );
    daily = parseChannelDaily(report);
  } catch (err) {
    warnings.push(`Channel analytics unavailable: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Public stats + details for tracked videos
  const ids = [...new Set(opts.contentIds)];
  const videos = ids.length ? await listVideos(ids, token) : [];
  const contentDetails = videos.map(parseVideoDetails);
  const publicStats = new Map(videos.map((v) => [v.id, parsePublicStatistics(v)]));
  const owned = videos.filter((v) => v.snippet?.channelId === ctx.platformAccountId).map((v) => v.id);

  // 4. Lifetime per-video analytics for videos this channel owns
  const analytics = new Map<string, VideoAnalytics>();
  for (const batch of chunk(owned, 200)) {
    try {
      const report = await analyticsApi<AnalyticsReport>(
        {
          ids: "channel==MINE",
          startDate: YT_EPOCH,
          endDate: isoDay(today),
          metrics: "views,likes,comments,shares,subscribersGained",
          dimensions: "video",
          filters: `video==${batch.join(",")}`,
          sort: "-views",
          maxResults: 200,
        },
        token,
      );
      for (const [k, v] of parseVideoAnalytics(report)) analytics.set(k, v);
    } catch (err) {
      const msg = err instanceof YouTubeApiError ? err.message : String(err);
      warnings.push(`Video analytics unavailable: ${msg}`);
      break;
    }
  }

  const contentMetrics: ContentMetricsResult[] = videos.map((v) => mergeVideoMetrics(publicStats.get(v.id), analytics.get(v.id), v.id));

  // 5. Per-day history for owned videos that have none stored yet (up to 90 days, max 50 videos per run)
  const contentHistory: ContentHistoryPoint[] = [];
  const wanted = new Set(opts.historyContentIds ?? []);
  const historyTargets = videos.filter((v) => wanted.has(v.id) && owned.includes(v.id) && analytics.has(v.id)).slice(0, 50);
  const historyStart = isoDay(new Date(today.getTime() - 90 * 86400000));
  for (const v of historyTargets) {
    const published = (v.snippet?.publishedAt ?? historyStart).slice(0, 10);
    try {
      const report = await analyticsApi<AnalyticsReport>(
        {
          ids: "channel==MINE",
          startDate: published > historyStart ? published : historyStart,
          endDate: isoDay(today),
          metrics: "views,likes,comments,shares,subscribersGained",
          dimensions: "day",
          filters: `video==${v.id}`,
          sort: "day",
        },
        token,
      );
      contentHistory.push(...cumulativeHistory(v.id, report, analytics.get(v.id)!));
    } catch (err) {
      warnings.push(`History backfill skipped for ${v.id}: ${err instanceof Error ? err.message : String(err)}`);
      break;
    }
  }

  const missing = ids.filter((id) => !publicStats.has(id));
  if (missing.length) warnings.push(`${missing.length} video(s) not returned by YouTube (deleted or private).`);

  return { account, daily, contentDetails, contentMetrics, contentHistory, warnings };
}

/** Most recent uploads from the channel's uploads playlist. */
export async function listRecentContent(ctx: SyncContext, limit: number): Promise<ContentDetails[]> {
  const ch = await getChannel(ctx.tokens.accessToken);
  const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];
  const res = await dataApi<{ items?: { contentDetails?: { videoId?: string } }[] }>(
    "/playlistItems",
    { part: "contentDetails", playlistId: uploads, maxResults: Math.min(limit, 50) },
    { accessToken: ctx.tokens.accessToken },
  );
  const ids = (res.items ?? []).map((i) => i.contentDetails?.videoId).filter((x): x is string => Boolean(x));
  return fetchContentDetails(ids, ctx.tokens);
}
