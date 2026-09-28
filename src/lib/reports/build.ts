import { compare, type Aggregate, type EngineInput, type PlatformPerformance } from "@/lib/analytics/engine";
import { addDays, monthRange, previousMonth } from "@/lib/dates";
import type { Client, Platform } from "@/lib/types";

/**
 * A monthly report is computed ONCE from stored snapshots and frozen into
 * reports.data, so a report that has been sent never silently changes.
 */
export interface ReportData {
  version: 1;
  client: Pick<Client, "id" | "name" | "company" | "industry">;
  month: string; // YYYY-MM
  period: { start: string; end: string };
  generatedAt: string;
  overview: {
    published: number;
    views: Aggregate;
    likes: Aggregate;
    comments: Aggregate;
    shares: Aggregate;
    engagements: Aggregate;
    engagementRate: number | null;
    followersGained: number | null;
    followersLost: number | null;
    followersNet: number | null;
    followersTotal: number | null;
    followersTotalAsOf: string | null;
    followersAttributed: Aggregate;
  };
  previous: { views: number | null; engagements: number | null; followersNet: number | null; published: number };
  growth: { views: number | null; engagements: number | null; followersNet: number | null; published: number | null };
  platforms: PlatformPerformance[];
  topContent: {
    id: string;
    title: string | null;
    url: string;
    thumbnail_url: string | null;
    platform: Platform;
    published_at: string | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    partial: boolean;
  }[];
  series: {
    daily: { date: string; views: number | null; engagements: number | null; followersNet: number | null; followersTotal: number | null }[];
    weeklyOutput: { label: string; start: string; count: number }[];
  };
  delivery: {
    total: number;
    byPlatform: { platform: Platform; count: number }[];
    items: { title: string | null; platform: Platform; published_at: string | null; url: string }[];
  };
  notes: string[];
}

export function buildReportData(opts: {
  input: EngineInput;
  client: Pick<Client, "id" | "name" | "company" | "industry">;
  month: string;
  now?: string;
}): ReportData {
  const range = monthRange(opts.month, opts.now);
  const prev = monthRange(previousMonth(opts.month), opts.now);
  const { current: cur, previous, growth } = compare(opts.input, range, prev);

  const top = cur.content
    .filter((c) => c.views !== null)
    .slice(0, 5)
    .map((c) => ({
      id: c.content.id,
      title: c.content.title,
      url: c.content.url,
      thumbnail_url: c.content.thumbnail_url,
      platform: c.content.platform,
      published_at: c.content.published_at,
      views: c.views,
      likes: c.likes,
      comments: c.comments,
      shares: c.shares,
      partial: c.partial,
    }));

  // Content output in 7-day buckets starting on the 1st of the month
  const weeks: ReportData["series"]["weeklyOutput"] = [];
  for (let start = range.start, i = 1; start <= range.end; start = addDays(start, 7), i++) {
    const end = addDays(start, 6) > range.end ? range.end : addDays(start, 6);
    weeks.push({
      label: `Wk ${i}`,
      start,
      count: cur.series.filter((p) => p.date >= start && p.date <= end).reduce((s, p) => s + p.published, 0),
    });
  }

  const published = cur.content.filter((c) => c.publishedInPeriod).map((c) => c.content);
  const byPlatform = new Map<Platform, number>();
  for (const c of published) byPlatform.set(c.platform, (byPlatform.get(c.platform) ?? 0) + 1);

  const notes: string[] = [];
  if (cur.coverage.partial)
    notes.push("Some content was first tracked during this month, so its figures for the month are lower bounds (no earlier snapshot existed).");
  if (cur.totals.shares.value === null) notes.push("Shares: Not available — the connected platform APIs did not provide share counts for this content.");
  if (cur.audience.followersNet === null)
    notes.push("Subscribers/followers gained: Not available — requires an authorised (OAuth) account connection with analytics access.");
  if (cur.platforms.some((p) => p.platform === "youtube"))
    notes.push("YouTube Analytics data can be delayed by up to 72 hours; the final days of the month may still be updating.");
  notes.push("Subscribers gained are channel-level figures. Subscribers attributed to individual videos are reported by the platform separately and are not the channel total.");

  return {
    version: 1,
    client: opts.client,
    month: opts.month.slice(0, 7),
    period: { start: range.start, end: range.end },
    generatedAt: new Date().toISOString(),
    overview: {
      published: cur.contentPublished,
      views: cur.totals.views,
      likes: cur.totals.likes,
      comments: cur.totals.comments,
      shares: cur.totals.shares,
      engagements: cur.totals.engagements,
      engagementRate: cur.totals.engagementRate,
      followersGained: cur.audience.followersGained,
      followersLost: cur.audience.followersLost,
      followersNet: cur.audience.followersNet,
      followersTotal: cur.audience.followersTotal,
      followersTotalAsOf: cur.audience.followersTotalAsOf,
      followersAttributed: cur.totals.followersAttributed,
    },
    previous: {
      views: previous.totals.views.value,
      engagements: previous.totals.engagements.value,
      followersNet: previous.audience.followersNet,
      published: previous.contentPublished,
    },
    growth,
    platforms: cur.platforms,
    topContent: top,
    series: {
      daily: cur.series.map(({ date, views, engagements, followersNet, followersTotal }) => ({ date, views, engagements, followersNet, followersTotal })),
      weeklyOutput: weeks,
    },
    delivery: {
      total: published.length,
      byPlatform: [...byPlatform.entries()].map(([platform, count]) => ({ platform, count })),
      items: published
        .sort((a, b) => ((a.published_at ?? "") < (b.published_at ?? "") ? -1 : 1))
        .map((c) => ({ title: c.title, platform: c.platform, published_at: c.published_at, url: c.url })),
    },
    notes,
  };
}
