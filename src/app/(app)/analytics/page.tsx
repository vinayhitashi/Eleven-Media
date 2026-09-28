import type { Metadata } from "next";
import { AnalyticsCharts, CoverageNote, KpiGrid } from "@/components/dashboard/analytics-overview";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { TrendChart } from "@/components/charts/trend-chart";
import { PlatformBadge } from "@/components/charts/platform-icon";
import { ContentThumb } from "@/components/content/thumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { NotAvailable, PageHeader, SectionTitle, Table, Td, Th } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { getAnalytics, listClients } from "@/lib/data";
import { parseRange } from "@/lib/dates";
import { isPlatform } from "@/platforms/registry";
import { PLATFORM_META } from "@/platforms/meta";
import { formatDate, formatNumber, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

type SP = Promise<{ range?: string; from?: string; to?: string; client?: string; platform?: string }>;

const N = ({ v, partial, signed }: { v: number | null; partial?: boolean; signed?: boolean }) =>
  v === null ? (
    <NotAvailable />
  ) : (
    <span className="tabular">
      {partial ? <span className="text-subtle" title="Lower bound">≥</span> : null}
      {signed && v > 0 ? "+" : ""}
      {formatNumber(v)}
    </span>
  );

export default async function AnalyticsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const viewer = await requireViewer();
  const isAdmin = viewer.role === "admin";
  const range = parseRange(sp);
  const platform = isPlatform(sp.platform) ? sp.platform : null;
  const clientId = isAdmin ? (sp.client ?? null) : viewer.client_id;
  const [clients, a] = await Promise.all([isAdmin ? listClients(viewer) : Promise.resolve([]), getAnalytics(viewer, { clientId, platform, range })]);
  const c = a.current;

  const totalSeries = c.series.map((p) => ({ date: p.date, value: p.followersTotal }));

  return (
    <>
      <PageHeader eyebrow="Performance" title="Analytics" description={`${range.label} (${formatDate(range.start)} – ${formatDate(range.end)}). Every figure is derived from stored daily snapshots.`} />
      <div className="mb-6">
        <FilterBar range={range.preset} from={range.start} to={range.end} clients={isAdmin ? clients.map((x) => ({ id: x.id, name: x.name })) : undefined} clientId={clientId} showPlatform platform={platform} />
      </div>

      <div className="space-y-8">
        <CoverageNote a={a} />
        <KpiGrid a={a} totalContent={c.contentTracked} />
        <AnalyticsCharts a={a} />

        <section>
          <SectionTitle>Audience</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Total subscribers" description="Point-in-time channel totals (sum across connected accounts)" />
              <CardBody className="pt-4">
                <TrendChart data={totalSeries} valueLabel="Total subscribers" format="number" height={220} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Subscriber breakdown" description="These are different measures — never interchangeable" />
              <CardBody>
                <dl className="divide-y divide-border text-[13px]">
                  {[
                    { k: "Total subscribers (now)", v: c.audience.followersTotal, d: c.audience.followersTotalAsOf ? `As of ${formatDate(c.audience.followersTotalAsOf)} — a point-in-time total, not a period value.` : "Point-in-time total." },
                    { k: "Gained in period", v: c.audience.followersGained, d: "Channel-level, from daily analytics." },
                    { k: "Lost in period", v: c.audience.followersLost, d: "Unsubscribes during the period." },
                    { k: "Net gained", v: c.audience.followersNet, d: "Gained − lost.", signed: true },
                    { k: "Attributed to content", v: c.totals.followersAttributed.value, d: "Subscribes the platform credits to specific videos. A subset of gained — never the channel total.", partial: c.totals.followersAttributed.partial },
                  ].map((row) => (
                    <div key={row.k} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="font-medium text-fg">{row.k}</dt>
                        <dd className="font-semibold"><N v={row.v} signed={row.signed} partial={row.partial} /></dd>
                      </div>
                      <p className="mt-0.5 text-[12px] text-subtle">{row.d}</p>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          </div>
        </section>

        <section>
          <SectionTitle>By platform</SectionTitle>
          <Card className="overflow-hidden">
            <Table>
              <thead>
                <tr>
                  <Th>Platform</Th>
                  <Th className="text-right">Tracked</Th>
                  <Th className="text-right">Published</Th>
                  <Th className="text-right">Views</Th>
                  <Th className="text-right">Engagements</Th>
                  <Th className="text-right">Eng. rate</Th>
                  <Th className="text-right">Net subs</Th>
                  <Th className="text-right">Total subs</Th>
                </tr>
              </thead>
              <tbody>
                {c.platforms.length === 0 ? (
                  <tr><Td colSpan={8} className="py-8 text-center text-[13px] text-subtle">No platform data for this selection.</Td></tr>
                ) : (
                  c.platforms.map((p) => (
                    <tr key={p.platform}>
                      <Td><span className="flex items-center gap-2 font-medium"><span className="size-2 rounded-full" style={{ background: PLATFORM_META[p.platform].color }} />{PLATFORM_META[p.platform].label}</span></Td>
                      <Td className="text-right tabular">{p.contentTracked}</Td>
                      <Td className="text-right tabular">{p.published}</Td>
                      <Td className="text-right"><N v={p.views.value} partial={p.views.partial} /></Td>
                      <Td className="text-right"><N v={p.engagements.value} partial={p.engagements.partial} /></Td>
                      <Td className="text-right tabular">{p.engagementRate === null ? <NotAvailable /> : formatPercent(p.engagementRate, 2)}</Td>
                      <Td className="text-right"><N v={p.followersNet} signed /></Td>
                      <Td className="text-right"><N v={p.followersTotal} /></Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card>
        </section>

        <section>
          <SectionTitle>Content performance in period</SectionTitle>
          <Card className="overflow-hidden">
            <Table>
              <thead>
                <tr>
                  <Th>Content</Th>
                  <Th className="hidden md:table-cell">Published</Th>
                  <Th className="text-right">Views</Th>
                  <Th className="hidden text-right sm:table-cell">Likes</Th>
                  <Th className="hidden text-right sm:table-cell">Comments</Th>
                  <Th className="hidden text-right lg:table-cell">Shares</Th>
                  <Th className="hidden text-right lg:table-cell">Subs from video</Th>
                  <Th className="text-right">Eng. rate</Th>
                </tr>
              </thead>
              <tbody>
                {c.content.slice(0, 50).map((x) => (
                  <tr key={x.content.id}>
                    <Td className="min-w-[260px]">
                      <div className="flex items-center gap-3">
                        <ContentThumb src={x.content.thumbnail_url} platform={x.content.platform} className="w-[72px]" />
                        <div className="min-w-0">
                          <a href={x.content.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-medium hover:underline hover:underline-offset-4">{x.content.title ?? x.content.url}</a>
                          <div className="mt-1 flex items-center gap-1.5">
                            <PlatformBadge platform={x.content.platform} compact />
                            {x.publishedInPeriod ? <span className="text-[11px] text-subtle">New this period</span> : null}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden whitespace-nowrap text-muted md:table-cell">{formatDate(x.content.published_at)}</Td>
                    <Td className="text-right font-medium"><N v={x.views} partial={x.partial} /></Td>
                    <Td className="hidden text-right sm:table-cell"><N v={x.likes} partial={x.partial} /></Td>
                    <Td className="hidden text-right sm:table-cell"><N v={x.comments} partial={x.partial} /></Td>
                    <Td className="hidden text-right lg:table-cell"><N v={x.shares} partial={x.partial} /></Td>
                    <Td className="hidden text-right lg:table-cell"><N v={x.followersAttributed} partial={x.partial} /></Td>
                    <Td className="text-right tabular">{x.engagementRate === null ? <NotAvailable /> : formatPercent(x.engagementRate, 2)}</Td>
                  </tr>
                ))}
                {c.content.length === 0 ? (
                  <tr><Td colSpan={8} className="py-8 text-center text-[13px] text-subtle">No content tracked for this selection.</Td></tr>
                ) : null}
              </tbody>
            </Table>
          </Card>
        </section>
      </div>
    </>
  );
}
