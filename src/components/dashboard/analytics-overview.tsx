import { AlertCircle } from "lucide-react";
import type { AnalyticsResult } from "@/lib/data";
import { BarList } from "@/components/charts/bar-list";
import { StatCard } from "@/components/charts/stat-card";
import { TrendChart } from "@/components/charts/trend-chart";
import { PlatformBadge } from "@/components/charts/platform-icon";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PLATFORM_META } from "@/platforms/meta";
import { formatCompact, formatDate, formatNumber, formatPercent, NOT_AVAILABLE } from "@/lib/utils";

const val = (v: number | null) => (v === null ? NOT_AVAILABLE : formatCompact(v));

export function KpiGrid({
  a,
  totalClients,
  totalContent,
}: {
  a: AnalyticsResult;
  totalClients?: number;
  totalContent: number;
}) {
  const c = a.current;
  const signed = (v: number | null) => (v === null ? NOT_AVAILABLE : `${v > 0 ? "+" : ""}${formatCompact(v)}`);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {totalClients !== undefined ? <StatCard label="Active clients" value={formatNumber(totalClients)} /> : null}
      <StatCard label="Content tracked" value={formatNumber(totalContent)} hint={`${c.contentPublished} published in this period`} delta={a.growth.published} deltaLabel="published vs prev." />
      <StatCard label="Views" value={val(c.totals.views.value)} delta={a.growth.views} partial={c.totals.views.partial} unavailable={c.totals.views.value === null} hint="Views generated during the period, from daily snapshots" />
      <StatCard label="Likes" value={val(c.totals.likes.value)} partial={c.totals.likes.partial} unavailable={c.totals.likes.value === null} />
      <StatCard label="Comments" value={val(c.totals.comments.value)} partial={c.totals.comments.partial} unavailable={c.totals.comments.value === null} />
      <StatCard label="Shares" value={val(c.totals.shares.value)} partial={c.totals.shares.partial} unavailable={c.totals.shares.value === null} hint="YouTube shares require a connected channel (Analytics API)" />
      <StatCard
        label="Subscribers gained"
        value={signed(c.audience.followersNet)}
        delta={a.growth.followersNet}
        unavailable={c.audience.followersNet === null}
        hint="Net channel/profile subscribers gained during the period (gained − lost). Requires a connected account."
      />
      <StatCard
        label="Total subscribers"
        value={val(c.audience.followersTotal)}
        unavailable={c.audience.followersTotal === null}
        hint={c.audience.followersTotalAsOf ? `Point-in-time total as of ${formatDate(c.audience.followersTotalAsOf)}` : "Point-in-time channel total"}
      />
      <StatCard label="Engagement rate" value={formatPercent(c.totals.engagementRate, 2)} unavailable={c.totals.engagementRate === null} hint="(Likes + comments + shares) ÷ views, for content where both are available" />
      <StatCard label="Growth" value={a.growth.views === null ? NOT_AVAILABLE : `${a.growth.views > 0 ? "+" : ""}${(a.growth.views * 100).toFixed(1)}%`} unavailable={a.growth.views === null} hint="Change in views vs the previous period of equal length" />
    </div>
  );
}

export function AnalyticsCharts({ a, contentHrefBase }: { a: AnalyticsResult; contentHrefBase?: string }) {
  const c = a.current;
  const prev = a.previous.series;
  const views = c.series.map((p, i) => ({ date: p.date, value: p.views, compare: prev[i]?.views ?? null }));
  const engagement = c.series.map((p) => ({ date: p.date, value: p.engagements }));
  const followers = c.series.map((p) => ({ date: p.date, value: p.followersNet }));

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title="Views over time" description="Daily views generated, from snapshot differences" />
        <CardBody className="pt-4">
          <TrendChart data={views} valueLabel="Views" compareLabel="Previous period" height={260} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Platform performance" description="Views in period by platform" />
        <CardBody className="pt-5">
          <BarList
            emptyLabel="No platform data yet"
            items={c.platforms
              .slice()
              .sort((x, y) => (y.views.value ?? -1) - (x.views.value ?? -1))
              .map((p) => ({
                key: p.platform,
                label: PLATFORM_META[p.platform].label,
                value: p.views.value,
                color: PLATFORM_META[p.platform].color,
                sub: `${p.contentTracked} tracked · ${p.published} published · ER ${formatPercent(p.engagementRate, 1)}`,
              }))}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Engagement over time" description="Likes + comments + shares per day" />
        <CardBody className="pt-4">
          <TrendChart data={engagement} kind="bar" valueLabel="Engagements" height={220} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Subscriber growth" description="Net subscribers gained per day (channel level)" />
        <CardBody className="pt-4">
          <TrendChart data={followers} kind="bar" format="signed" valueLabel="Net subscribers" height={220} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Top content" description="By views gained in this period" />
        <CardBody className="pt-5">
          <BarList
            emptyLabel="No content with view data in this period"
            items={c.content
              .filter((x) => x.views !== null && x.views > 0)
              .slice(0, 5)
              .map((x) => ({
                key: x.content.id,
                label: x.content.title ?? x.content.url,
                value: x.views,
                href: contentHrefBase ? `${contentHrefBase}${x.content.id}` : x.content.url,
                sub: (
                  <span className="inline-flex items-center gap-2">
                    <PlatformBadge platform={x.content.platform} compact className="h-[18px] px-1.5 text-[10.5px]" />
                    {formatCompact(x.likes)} likes · {formatCompact(x.comments)} comments
                  </span>
                ),
              }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}

export function CoverageNote({ a }: { a: AnalyticsResult }) {
  const c = a.current;
  if (!c.coverage.partial && c.coverage.snapshotCount > 0) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-[13px] text-muted">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-subtle" />
      {c.coverage.snapshotCount === 0 ? (
        <span>No metric snapshots exist for this period yet. Snapshots are collected daily once content is added and accounts are connected — history builds up from the first sync.</span>
      ) : (
        <span>
          Some content started being tracked during this period, so figures marked <strong className="font-semibold text-fg">≥</strong> are lower bounds. Values
          are never estimated.
        </span>
      )}
    </div>
  );
}
