"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import { formatCompact, formatNumber } from "@/lib/utils";

export type ValueFormat = "compact" | "number" | "signed";

export interface TrendPoint {
  date: string;
  value: number | null;
  compare?: number | null;
}

const fmt = (v: number | null | undefined, f: ValueFormat) => {
  if (v === null || v === undefined) return "Not available";
  if (f === "signed") return `${v > 0 ? "+" : ""}${formatNumber(v)}`;
  return f === "compact" ? formatNumber(v) : formatNumber(v);
};

const shortDate = (d: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

const longDate = (d: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

function ChartTooltip({
  active,
  payload,
  label,
  format,
  valueLabel,
  compareLabel,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number | null; payload?: TrendPoint }[];
  label?: string;
  format: ValueFormat;
  valueLabel: string;
  compareLabel?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const p = payload[0]?.payload;
  return (
    <div className="min-w-[160px] rounded-xl border border-border bg-surface px-3 py-2.5 text-[12px] shadow-pop">
      <div className="mb-1.5 text-subtle">{longDate(label)}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted">
          <span className="size-2 rounded-full bg-[var(--chart-ink)]" aria-hidden />
          {valueLabel}
        </span>
        <span className="font-semibold tabular text-fg">{fmt(p?.value, format)}</span>
      </div>
      {compareLabel ? (
        <div className="mt-1 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-0.5 w-2.5 rounded bg-[var(--chart-compare)]" aria-hidden />
            {compareLabel}
          </span>
          <span className="tabular text-muted">{fmt(p?.compare, format)}</span>
        </div>
      ) : null}
    </div>
  );
}

const axisTick = { fill: "var(--subtle)", fontSize: 11 };

/**
 * Single-measure time series. Gaps (null) are drawn as gaps, never as zero.
 * Optional dashed comparison series = the previous period, aligned day-by-day.
 */
export function TrendChart({
  data,
  kind = "area",
  format = "compact",
  valueLabel,
  compareLabel,
  height = 240,
}: {
  data: TrendPoint[];
  kind?: "area" | "bar";
  format?: ValueFormat;
  valueLabel: string;
  compareLabel?: string;
  height?: number;
}) {
  const hasData = data.some((d) => d.value !== null);
  if (!hasData) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border-strong text-center text-[13px] text-subtle" style={{ height }}>
        <div>
          <div className="font-medium text-muted">Not available</div>
          <div className="mt-0.5">No data from the platform APIs for this period yet.</div>
        </div>
      </div>
    );
  }
  const ticks = { tickLine: false, axisLine: false, tick: axisTick } as const;
  const interval = Math.max(0, Math.ceil(data.length / 7) - 1);
  const tooltip = (
    <Tooltip
      cursor={kind === "bar" ? { fill: "var(--chart-ink-soft)" } : { stroke: "var(--chart-axis)", strokeWidth: 1 }}
      content={<ChartTooltip format={format} valueLabel={valueLabel} compareLabel={compareLabel} />}
    />
  );

  return (
    <div style={{ height }} role="img" aria-label={`${valueLabel} over time`}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={data.length > 45 ? 1 : 2}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="date" {...ticks} tickFormatter={shortDate} interval={interval} minTickGap={16} />
            <YAxis {...ticks} width={44} tickFormatter={(v: number) => formatCompact(v)} />
            {tooltip}
            <Bar dataKey="value" fill="var(--chart-ink)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.date} fill={(d.value ?? 0) < 0 ? "var(--chart-neg)" : "var(--chart-ink)"} />
              ))}
            </Bar>
          </BarChart>
        ) : compareLabel ? (
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-ink)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--chart-ink)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="date" {...ticks} tickFormatter={shortDate} interval={interval} minTickGap={16} />
            <YAxis {...ticks} width={44} tickFormatter={(v: number) => formatCompact(v)} />
            {tooltip}
            <Line type="monotone" dataKey="compare" stroke="var(--chart-compare)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="value" stroke="var(--chart-ink)" strokeWidth={2} fill="url(#trendFill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--chart-surface)", fill: "var(--chart-ink)" }} isAnimationActive={false} />
          </ComposedChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="trendFillSolo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-ink)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--chart-ink)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="date" {...ticks} tickFormatter={shortDate} interval={interval} minTickGap={16} />
            <YAxis {...ticks} width={44} tickFormatter={(v: number) => formatCompact(v)} domain={["auto", "auto"]} />
            {tooltip}
            <Area type="monotone" dataKey="value" stroke="var(--chart-ink)" strokeWidth={2} fill="url(#trendFillSolo)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--chart-surface)", fill: "var(--chart-ink)" }} isAnimationActive={false} />
          </AreaChart>
        )}
      </ResponsiveContainer>
      {compareLabel ? (
        <div className="mt-2 flex items-center gap-4 text-[11.5px] text-subtle">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-[var(--chart-ink)]" />{valueLabel}</span>
          <span className="flex items-center gap-1.5"><span className="h-0 w-3 border-t-[1.5px] border-dashed border-[var(--chart-compare)]" />{compareLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
