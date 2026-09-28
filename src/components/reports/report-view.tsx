import { PlatformBadge } from "@/components/charts/platform-icon";
import { TrendChart } from "@/components/charts/trend-chart";
import { ContentThumb } from "@/components/content/thumb";
import { NotAvailable } from "@/components/ui/misc";
import type { ReportData } from "@/lib/reports/build";
import { PLATFORM_META } from "@/platforms/meta";
import { cn, formatCompact, formatDate, formatMonth, formatNumber, formatPercent, formatSignedPercent } from "@/lib/utils";

function Kpi({ label, value, delta, partial }: { label: string; value: number | null; delta?: number | null; partial?: boolean; signed?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-subtle">{label}</div>
      <div className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em]">
        {value === null ? <span className="text-[14px] font-medium tracking-normal text-subtle">Not available</span> : <>{partial ? <span className="text-[14px] text-subtle">≥</span> : null}{formatCompact(value)}</>}
      </div>
      {delta !== undefined ? (
        <div className={cn("mt-2 text-[12px] tabular", delta === null ? "text-subtle" : delta >= 0 ? "text-good" : "text-bad")}>
          {delta === null ? "— vs last month" : `${formatSignedPercent(delta)} vs last month`}
        </div>
      ) : null}
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border px-6 py-8 sm:px-10">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-mono text-[11px] font-semibold text-accent-text">{n}</span>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function ReportView({ data }: { data: ReportData }) {
  const o = data.overview;
  const daily = data.series.daily;
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {/* Cover */}
      <header className="brand-backdrop relative overflow-hidden px-6 py-10 text-white sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#2fe38a] text-[#03140a]">
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden><rect x="6" y="4" width="3.2" height="16" rx="0.6" /><rect x="14.8" y="4" width="3.2" height="16" rx="0.6" /></svg>
            </span>
            <span className="text-[13px] font-semibold uppercase tracking-[0.18em]">Eleven Media</span>
          </div>
        </div>
        <p className="mt-10 text-[11px] uppercase tracking-[0.2em] text-[#2fe38a]">Monthly growth report</p>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-[-0.02em]">{data.client.name}</h1>
        <p className="mt-1 text-white/60">{[data.client.company, data.client.industry].filter(Boolean).join(" · ")}</p>
        <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-[13px]">
          <div><div className="text-white/40">Month</div><div className="font-medium">{formatMonth(data.month)}</div></div>
          <div><div className="text-white/40">Period</div><div className="font-medium">{formatDate(data.period.start)} – {formatDate(data.period.end)}</div></div>
          <div><div className="text-white/40">Prepared</div><div className="font-medium">{formatDate(data.generatedAt)}</div></div>
        </div>
      </header>

      <Section n="01" title="Monthly overview">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Content published" value={o.published} delta={data.growth.published} />
          <Kpi label="Views" value={o.views.value} delta={data.growth.views} partial={o.views.partial} />
          <Kpi label="Subscribers gained" value={o.followersNet} delta={data.growth.followersNet} />
          <Kpi label="Engagements" value={o.engagements.value} delta={data.growth.engagements} partial={o.engagements.partial} />
          <Kpi label="Likes" value={o.likes.value} partial={o.likes.partial} />
          <Kpi label="Comments" value={o.comments.value} partial={o.comments.partial} />
          <Kpi label="Shares" value={o.shares.value} partial={o.shares.partial} />
          <div className="rounded-xl border border-border p-4">
            <div className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-subtle">Engagement rate</div>
            <div className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em]">{o.engagementRate === null ? <span className="text-[14px] font-medium text-subtle">Not available</span> : formatPercent(o.engagementRate, 2)}</div>
            <div className="mt-2 text-[12px] text-subtle">(likes + comments + shares) ÷ views</div>
          </div>
        </div>
        <p className="mt-4 text-[12.5px] text-muted">
          Total subscribers: <strong className="text-fg">{o.followersTotal === null ? "Not available" : formatNumber(o.followersTotal)}</strong>
          {o.followersTotalAsOf ? ` (as of ${formatDate(o.followersTotalAsOf)})` : ""}. Subscribers attributed to individual videos this month:{" "}
          <strong className="text-fg">{o.followersAttributed.value === null ? "Not available" : formatNumber(o.followersAttributed.value)}</strong>.
        </p>
      </Section>

      <Section n="02" title="Growth trends">
        <div className="grid gap-6 lg:grid-cols-2">
          <div><div className="mb-2 text-[13px] font-medium">Views per day</div><TrendChart data={daily.map((d) => ({ date: d.date, value: d.views }))} valueLabel="Views" height={200} /></div>
          <div><div className="mb-2 text-[13px] font-medium">Engagements per day</div><TrendChart data={daily.map((d) => ({ date: d.date, value: d.engagements }))} kind="bar" valueLabel="Engagements" height={200} /></div>
          <div><div className="mb-2 text-[13px] font-medium">Net subscribers per day</div><TrendChart data={daily.map((d) => ({ date: d.date, value: d.followersNet }))} kind="bar" format="signed" valueLabel="Net subscribers" height={200} /></div>
          <div><div className="mb-2 text-[13px] font-medium">Content output per week</div><TrendChart data={data.series.weeklyOutput.map((w) => ({ date: w.start, value: w.count }))} kind="bar" format="number" valueLabel="Posts published" height={200} /></div>
        </div>
      </Section>

      <Section n="03" title="Platform performance">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-subtle">
                <th className="px-2 pb-2 font-medium">Platform</th>
                <th className="px-2 pb-2 text-right font-medium">Published</th>
                <th className="px-2 pb-2 text-right font-medium">Views</th>
                <th className="px-2 pb-2 text-right font-medium">Engagements</th>
                <th className="px-2 pb-2 text-right font-medium">Eng. rate</th>
                <th className="px-2 pb-2 text-right font-medium">Net subscribers</th>
              </tr>
            </thead>
            <tbody>
              {data.platforms.map((p) => (
                <tr key={p.platform} className="border-t border-border">
                  <td className="px-2 py-2.5 font-medium"><span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: PLATFORM_META[p.platform].color }} />{PLATFORM_META[p.platform].label}</span></td>
                  <td className="px-2 py-2.5 text-right tabular">{p.published}</td>
                  <td className="px-2 py-2.5 text-right tabular">{p.views.value === null ? <NotAvailable /> : formatNumber(p.views.value)}</td>
                  <td className="px-2 py-2.5 text-right tabular">{p.engagements.value === null ? <NotAvailable /> : formatNumber(p.engagements.value)}</td>
                  <td className="px-2 py-2.5 text-right tabular">{p.engagementRate === null ? <NotAvailable /> : formatPercent(p.engagementRate, 2)}</td>
                  <td className="px-2 py-2.5 text-right tabular">{p.followersNet === null ? <NotAvailable /> : `${p.followersNet > 0 ? "+" : ""}${formatNumber(p.followersNet)}`}</td>
                </tr>
              ))}
              {data.platforms.length === 0 ? <tr><td colSpan={6} className="px-2 py-6 text-center text-subtle">No platform data this month.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n="04" title="Top content">
        {data.topContent.length ? (
          <ol className="space-y-3">
            {data.topContent.map((c, i) => (
              <li key={c.id} className="flex items-center gap-4 rounded-xl border border-border p-3">
                <span className="w-5 text-center font-mono text-[12px] text-subtle">{i + 1}</span>
                <ContentThumb src={c.thumbnail_url} platform={c.platform} className="w-[112px]" />
                <div className="min-w-0 flex-1">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-medium hover:underline hover:underline-offset-4">{c.title ?? c.url}</a>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                    <PlatformBadge platform={c.platform} />
                    <span>{formatDate(c.published_at)}</span>
                  </div>
                </div>
                <dl className="hidden grid-cols-4 gap-5 text-right text-[12px] md:grid">
                  {[["Views", c.views], ["Likes", c.likes], ["Comments", c.comments], ["Shares", c.shares]].map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="text-subtle">{k}</dt>
                      <dd className="mt-0.5 font-semibold tabular text-fg">{v === null ? <NotAvailable /> : <>{c.partial ? "≥" : ""}{formatCompact(v as number)}</>}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[13px] text-subtle">No content with view data this month.</p>
        )}
      </Section>

      <Section n="05" title="Content delivery summary">
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <div className="text-[44px] font-semibold leading-none tracking-[-0.03em]">{data.delivery.total}</div>
            <div className="mt-1 text-[13px] text-muted">pieces of content published in {formatMonth(data.month)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.delivery.byPlatform.map((p) => (
              <span key={p.platform} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[12.5px]">
                <span className="size-2 rounded-full" style={{ background: PLATFORM_META[p.platform].color }} />
                {PLATFORM_META[p.platform].label} <strong className="tabular">{p.count}</strong>
              </span>
            ))}
          </div>
        </div>
        {data.delivery.items.length ? (
          <ul className="mt-6 divide-y divide-border rounded-xl border border-border text-[13px]">
            {data.delivery.items.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="min-w-0 truncate">{it.title ?? it.url}</span>
                <span className="flex shrink-0 items-center gap-3 text-[12px] text-subtle">
                  {PLATFORM_META[it.platform].label}
                  <span className="tabular">{formatDate(it.published_at, { day: "numeric", month: "short" })}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section n="06" title="Notes on the data">
        <ul className="list-disc space-y-1.5 pl-4 text-[12.5px] leading-relaxed text-muted">
          {data.notes.map((n) => <li key={n}>{n}</li>)}
          <li>All figures are derived from daily snapshots collected via official platform APIs. Metrics a platform does not provide are shown as “Not available” and are never estimated.</li>
        </ul>
      </Section>
    </article>
  );
}
