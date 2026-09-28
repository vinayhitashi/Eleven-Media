/**
 * Analytics engine — pure functions over stored historical snapshots.
 *
 * Content metrics are stored as daily snapshots of CUMULATIVE lifetime totals
 * (e.g. Day 1: 100,000 views · Day 7: 150,000 views). Everything a period shows
 * is derived from differences between snapshots, never from a single "current"
 * number:
 *
 *   gained(period) = cumulative(end of period) − cumulative(day before period)
 *
 * Rules that keep the numbers honest:
 *  - A metric the platform never returned stays `null` ("Not available"), not 0.
 *  - Content published inside the period starts from 0, so its whole total counts.
 *  - Content published BEFORE the period with no snapshot before it has an unknown
 *    baseline. We use its first in‑period snapshot as the baseline (undercounts,
 *    never overcounts) and flag the result as `partial`.
 *  - Channel/profile followers come from account-level daily data. Totals are
 *    point-in-time; gains are flows. Follows attributed to a specific video are a
 *    separate metric (`followersAttributed`) and never mixed with the channel total.
 */
import { addDays, eachDay, type DateRange } from "@/lib/dates";
import type { AccountMetricDay, Content, ContentMetricSnapshot, Platform } from "@/lib/types";

export type MetricKey = "views" | "likes" | "comments" | "shares" | "followers_gained";
const METRICS: MetricKey[] = ["views", "likes", "comments", "shares", "followers_gained"];

export type EngineContent = Pick<Content, "id" | "client_id" | "platform" | "title" | "url" | "thumbnail_url" | "published_at" | "social_account_id" | "content_type">;

export interface EngineInput {
  contents: EngineContent[];
  /** Snapshots within the range AND the latest one before it per content (the baseline). */
  snapshots: ContentMetricSnapshot[];
  accountDays: AccountMetricDay[];
}

export interface Aggregate {
  value: number | null;
  /** True when at least one contributing item had an unknown baseline (value is a lower bound). */
  partial: boolean;
}

export interface ContentPerformance {
  content: EngineContent;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  followersAttributed: number | null;
  engagements: number | null;
  engagementRate: number | null;
  partial: boolean;
  /** Lifetime cumulative values as of the latest snapshot ≤ period end. */
  lifetime: Record<MetricKey, number | null>;
  publishedInPeriod: boolean;
}

export interface SeriesPoint {
  date: string;
  views: number | null;
  engagements: number | null;
  followersNet: number | null;
  followersTotal: number | null;
  published: number;
}

export interface PlatformPerformance {
  platform: Platform;
  contentTracked: number;
  published: number;
  views: Aggregate;
  engagements: Aggregate;
  engagementRate: number | null;
  followersNet: number | null;
  followersTotal: number | null;
}

export interface PeriodAnalytics {
  range: { start: string; end: string };
  totals: {
    views: Aggregate;
    likes: Aggregate;
    comments: Aggregate;
    shares: Aggregate;
    engagements: Aggregate;
    engagementRate: number | null;
    followersAttributed: Aggregate;
  };
  audience: {
    followersGained: number | null;
    followersLost: number | null;
    followersNet: number | null;
    /** Sum of the latest known total per account (point-in-time, NOT a period value). */
    followersTotal: number | null;
    followersTotalAsOf: string | null;
  };
  contentPublished: number;
  contentTracked: number;
  series: SeriesPoint[];
  platforms: PlatformPerformance[];
  content: ContentPerformance[];
  coverage: { partial: boolean; snapshotCount: number; lastSnapshot: string | null };
}

const sumNullable = (vals: (number | null)[]): number | null => {
  let any = false;
  let total = 0;
  for (const v of vals) {
    if (v !== null && v !== undefined) {
      any = true;
      total += v;
    }
  }
  return any ? total : null;
};

const pubDay = (c: EngineContent) => (c.published_at ? c.published_at.slice(0, 10) : null);

/**
 * Cumulative-value lookup for one content item and one metric, consistent across
 * the period delta and the daily series.
 */
function makeCumulative(snaps: ContentMetricSnapshot[], metric: MetricKey, content: EngineContent, range: DateRange | { start: string; end: string }) {
  const points = snaps.filter((s) => s[metric] !== null && s[metric] !== undefined).map((s) => ({ d: s.recorded_on, v: s[metric] as number }));
  const published = pubDay(content);
  const publishedInside = published !== null && published >= range.start;
  const hasBaseline = points.some((p) => p.d < range.start);
  const firstInRange = points.find((p) => p.d >= range.start && p.d <= range.end);
  const available = points.some((p) => p.d <= range.end);
  const partial = available && !hasBaseline && !publishedInside;

  function at(day: string): number | null {
    if (!available) return null;
    let last: number | null = null;
    for (const p of points) {
      if (p.d <= day) last = p.v;
      else break;
    }
    if (last !== null) return last;
    // Before the first observation:
    if (publishedInside) return 0; // new content starts from zero
    return firstInRange ? firstInRange.v : null; // unknown baseline → flat (lower bound)
  }
  return { at, partial, available };
}

export function computePeriod(input: EngineInput, range: { start: string; end: string }): PeriodAnalytics {
  const days = eachDay(range.start, range.end);
  const dayBefore = addDays(range.start, -1);

  const byContent = new Map<string, ContentMetricSnapshot[]>();
  for (const s of input.snapshots) {
    if (s.recorded_on > range.end) continue;
    const arr = byContent.get(s.content_id) ?? [];
    arr.push(s);
    byContent.set(s.content_id, arr);
  }
  for (const arr of byContent.values()) arr.sort((a, b) => (a.recorded_on < b.recorded_on ? -1 : 1));

  // Only content that existed by the end of the range.
  const contents = input.contents.filter((c) => {
    const p = pubDay(c);
    return p === null || p <= range.end;
  });

  const dailyGain: Record<MetricKey, (number | null)[]> = {
    views: days.map(() => null),
    likes: days.map(() => null),
    comments: days.map(() => null),
    shares: days.map(() => null),
    followers_gained: days.map(() => null),
  };

  const performance: ContentPerformance[] = contents.map((content) => {
    const snaps = byContent.get(content.id) ?? [];
    const result = { views: null, likes: null, comments: null, shares: null, followers_gained: null } as Record<MetricKey, number | null>;
    const lifetime = { ...result };
    let partial = false;

    for (const m of METRICS) {
      const cum = makeCumulative(snaps, m, content, range);
      if (!cum.available) continue;
      const endV = cum.at(range.end);
      const startV = cum.at(dayBefore);
      lifetime[m] = endV;
      if (endV === null || startV === null) continue;
      result[m] = endV - startV;
      if (cum.partial) partial = true;

      let prev = startV;
      days.forEach((d, i) => {
        const v = cum.at(d);
        if (v === null) return;
        const gain = v - prev;
        prev = v;
        dailyGain[m][i] = (dailyGain[m][i] ?? 0) + gain;
      });
    }

    const engagements = sumNullable([result.likes, result.comments, result.shares]);
    const p = pubDay(content);
    return {
      content,
      views: result.views,
      likes: result.likes,
      comments: result.comments,
      shares: result.shares,
      followersAttributed: result.followers_gained,
      engagements,
      engagementRate: engagements !== null && result.views ? engagements / result.views : null,
      partial,
      lifetime,
      publishedInPeriod: p !== null && p >= range.start && p <= range.end,
    };
  });

  performance.sort((a, b) => (b.views ?? -1) - (a.views ?? -1));

  const agg = (key: "views" | "likes" | "comments" | "shares" | "followersAttributed" | "engagements", items = performance): Aggregate => ({
    value: sumNullable(items.map((p) => p[key])),
    partial: items.some((p) => p.partial && p[key] !== null),
  });

  const rate = (items: ContentPerformance[]) => {
    // Only items where both engagement and views are known contribute to the rate.
    const both = items.filter((p) => p.engagements !== null && p.views !== null);
    const v = both.reduce((s, p) => s + (p.views ?? 0), 0);
    const e = both.reduce((s, p) => s + (p.engagements ?? 0), 0);
    return v > 0 ? e / v : null;
  };

  // ── Account-level audience ────────────────────────────────────────────
  const accountDaysInRange = input.accountDays.filter((a) => a.recorded_on >= range.start && a.recorded_on <= range.end);
  const audienceFor = (rows: AccountMetricDay[], allRows: AccountMetricDay[]) => {
    const gained = sumNullable(rows.map((r) => r.followers_gained));
    const lost = sumNullable(rows.map((r) => r.followers_lost));
    const net = gained === null ? null : gained - (lost ?? 0);
    // Latest known total per account, as of range end.
    const latest = new Map<string, AccountMetricDay>();
    for (const r of allRows) {
      if (r.followers_total === null || r.recorded_on > range.end) continue;
      const cur = latest.get(r.social_account_id);
      if (!cur || cur.recorded_on < r.recorded_on) latest.set(r.social_account_id, r);
    }
    const totals = [...latest.values()];
    return {
      followersGained: gained,
      followersLost: lost,
      followersNet: net,
      followersTotal: sumNullable(totals.map((t) => t.followers_total)),
      followersTotalAsOf: totals.length ? totals.map((t) => t.recorded_on).sort().at(-1)! : null,
    };
  };
  const audience = audienceFor(accountDaysInRange, input.accountDays);

  // Daily totals of followers (carry-forward per account)
  const accountIds = [...new Set(input.accountDays.map((a) => a.social_account_id))];
  const totalsByAccount = new Map(accountIds.map((id) => [id, input.accountDays.filter((a) => a.social_account_id === id && a.followers_total !== null).sort((a, b) => (a.recorded_on < b.recorded_on ? -1 : 1))]));

  const series: SeriesPoint[] = days.map((d, i) => {
    const rows = accountDaysInRange.filter((a) => a.recorded_on === d);
    const gained = sumNullable(rows.map((r) => r.followers_gained));
    const lost = sumNullable(rows.map((r) => r.followers_lost));
    const totals = accountIds.map((id) => {
      const arr = totalsByAccount.get(id)!;
      let last: number | null = null;
      for (const r of arr) {
        if (r.recorded_on <= d) last = r.followers_total;
        else break;
      }
      return last;
    });
    return {
      date: d,
      views: dailyGain.views[i]!,
      engagements: sumNullable([dailyGain.likes[i]!, dailyGain.comments[i]!, dailyGain.shares[i]!]),
      followersNet: gained === null ? null : gained - (lost ?? 0),
      followersTotal: sumNullable(totals),
      published: contents.filter((c) => pubDay(c) === d).length,
    };
  });

  const platforms = [...new Set([...contents.map((c) => c.platform), ...input.accountDays.map((a) => a.platform)])].map((platform): PlatformPerformance => {
    const items = performance.filter((p) => p.content.platform === platform);
    const acc = audienceFor(
      accountDaysInRange.filter((a) => a.platform === platform),
      input.accountDays.filter((a) => a.platform === platform),
    );
    return {
      platform,
      contentTracked: items.length,
      published: items.filter((p) => p.publishedInPeriod).length,
      views: agg("views", items),
      engagements: agg("engagements", items),
      engagementRate: rate(items),
      followersNet: acc.followersNet,
      followersTotal: acc.followersTotal,
    };
  });

  const inRangeSnaps = input.snapshots.filter((s) => s.recorded_on >= range.start && s.recorded_on <= range.end);

  return {
    range: { start: range.start, end: range.end },
    totals: {
      views: agg("views"),
      likes: agg("likes"),
      comments: agg("comments"),
      shares: agg("shares"),
      engagements: agg("engagements"),
      engagementRate: rate(performance),
      followersAttributed: agg("followersAttributed"),
    },
    audience,
    contentPublished: performance.filter((p) => p.publishedInPeriod).length,
    contentTracked: contents.length,
    series,
    platforms,
    content: performance,
    coverage: {
      partial: performance.some((p) => p.partial),
      snapshotCount: inRangeSnaps.length,
      lastSnapshot: inRangeSnaps.length ? inRangeSnaps.map((s) => s.recorded_on).sort().at(-1)! : null,
    },
  };
}

/** Fractional change; null when the previous value is unknown or zero. */
export function growth(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export interface AnalyticsComparison {
  current: PeriodAnalytics;
  previous: PeriodAnalytics;
  growth: {
    views: number | null;
    engagements: number | null;
    followersNet: number | null;
    published: number | null;
  };
}

export function compare(input: EngineInput, range: { start: string; end: string }, prev: { start: string; end: string }): AnalyticsComparison {
  const current = computePeriod(input, range);
  const previous = computePeriod(input, prev);
  return {
    current,
    previous,
    growth: {
      views: growth(current.totals.views.value, previous.totals.views.value),
      engagements: growth(current.totals.engagements.value, previous.totals.engagements.value),
      followersNet: growth(current.audience.followersNet, previous.audience.followersNet),
      published: growth(current.contentPublished, previous.contentPublished),
    },
  };
}
