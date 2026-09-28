/** Date helpers. All analytics dates are UTC calendar days as "YYYY-MM-DD" strings. */

export type RangePreset = "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  start: string;
  end: string;
  preset: RangePreset | "month";
  label: string;
}

const DAY = 86400000;

export function toDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseDay(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function addDays(day: string, n: number): string {
  return toDay(new Date(parseDay(day).getTime() + n * DAY));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / DAY);
}

export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function today(): string {
  return toDay(new Date());
}

const PRESETS: Record<Exclude<RangePreset, "custom">, { days: number; label: string }> = {
  "7d": { days: 7, label: "Last 7 days" },
  "30d": { days: 30, label: "Last 30 days" },
  "90d": { days: 90, label: "Last 3 months" },
};

const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseDay(s).getTime());

/** Parses `?range=7d|30d|90d|custom&from=&to=` into a validated range (defaults to 30 days). */
export function parseRange(sp: { range?: string | string[]; from?: string | string[]; to?: string | string[] }, now = today()): DateRange {
  const range = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const from = Array.isArray(sp.from) ? sp.from[0] : sp.from;
  const to = Array.isArray(sp.to) ? sp.to[0] : sp.to;

  if (range === "custom" && isDay(from) && isDay(to)) {
    let [s, e] = from <= to ? [from, to] : [to, from];
    if (e > now) e = now;
    if (daysBetween(s, e) > 730) s = addDays(e, -730);
    return { start: s, end: e, preset: "custom", label: `${s} → ${e}` };
  }
  const key = (range && range in PRESETS ? range : "30d") as keyof typeof PRESETS;
  const p = PRESETS[key];
  return { start: addDays(now, -(p.days - 1)), end: now, preset: key, label: p.label };
}

/** The equal-length period immediately before `r` (for growth comparisons). */
export function previousRange(r: DateRange): DateRange {
  const len = daysBetween(r.start, r.end) + 1;
  const end = addDays(r.start, -1);
  return { start: addDays(end, -(len - 1)), end, preset: "custom", label: "Previous period" };
}

/** Calendar month "YYYY-MM" → range, clamped to today for the current month. */
export function monthRange(month: string, now = today()): DateRange {
  const start = `${month.slice(0, 7)}-01`;
  const d = parseDay(start);
  const last = toDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
  const end = last > now ? now : last;
  return { start, end, preset: "month", label: month.slice(0, 7) };
}

export function previousMonth(month: string): string {
  const d = parseDay(`${month.slice(0, 7)}-01`);
  return toDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1))).slice(0, 7);
}

export function rangeQuery(r: DateRange): string {
  return r.preset === "custom" ? `range=custom&from=${r.start}&to=${r.end}` : r.preset === "month" ? "" : `range=${r.preset}`;
}
