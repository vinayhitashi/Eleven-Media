import "server-only";
import { Document, Image, Link, Page, Path, Rect, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ReportData } from "./build";
import { formatCompact, formatDate, formatMonth, formatNumber, formatPercent, formatSignedPercent } from "@/lib/utils";

/**
 * Branded, client-ready PDF rendition of a frozen report. Uses the built-in
 * Helvetica family so rendering never depends on remote font downloads.
 */

const INK = "#06120b";
const GREEN = "#0b9a55";
const BLACK = "#050706";
const NEON = "#2fe38a";
const MUTED = "#52514e";
const SUBTLE = "#898781";
const LINE = "#e2e9e4";
const SOFT = "#eef3f0";
const GOOD = "#006300";
const BAD = "#b3261e";
const PLATFORM_COLORS: Record<string, string> = { youtube: "#0b9a55", instagram: "#2a78d6", tiktok: "#eb6834", facebook: "#4a3aa7", linkedin: "#e87ba4" };
const PLATFORM_LABELS: Record<string, string> = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", linkedin: "LinkedIn" };

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9.5, color: INK },
  band: { backgroundColor: BLACK, color: "#fff", marginTop: -40, marginHorizontal: -40, paddingHorizontal: 40, paddingTop: 36, paddingBottom: 32, marginBottom: 26 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center" },
  brandText: { fontFamily: "Helvetica-Bold", fontSize: 9, letterSpacing: 2.2, marginLeft: 8 },
  eyebrow: { fontSize: 8, letterSpacing: 2, color: NEON, marginTop: 34 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 28, marginTop: 6 },
  subtitle: { fontSize: 11, color: "#bdbdb8", marginTop: 4 },
  metaRow: { flexDirection: "row", marginTop: 22 },
  metaCell: { marginRight: 36 },
  metaLabel: { fontSize: 7.5, color: "#8a8a86", marginBottom: 3 },
  metaValue: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  h2row: { flexDirection: "row", alignItems: "baseline", marginBottom: 12, marginTop: 6 },
  h2num: { fontFamily: "Courier-Bold", fontSize: 8, color: GREEN, marginRight: 8 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  kpi: { width: "25%", padding: 4 },
  kpiInner: { borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 10, height: 70 },
  kpiLabel: { fontSize: 7, letterSpacing: 1, color: SUBTLE },
  kpiValue: { fontFamily: "Helvetica-Bold", fontSize: 18, marginTop: 7 },
  kpiNA: { fontSize: 9.5, color: SUBTLE, marginTop: 11 },
  kpiDelta: { fontSize: 7.5, marginTop: 6 },
  note: { fontSize: 8.5, color: MUTED, marginTop: 10, lineHeight: 1.45 },
  chartBox: { width: "50%", padding: 6 },
  chartTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 6 },
  chartMeta: { fontSize: 7, color: SUBTLE, marginTop: 3 },
  table: { borderTopWidth: 1, borderColor: LINE, marginTop: 4 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: LINE, paddingVertical: 6, alignItems: "center" },
  th: { fontSize: 7, letterSpacing: 1, color: SUBTLE },
  td: { fontSize: 9 },
  topRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 7, marginBottom: 6 },
  thumb: { width: 84, height: 47, borderRadius: 4, backgroundColor: SOFT, objectFit: "cover" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: SUBTLE, borderTopWidth: 1, borderColor: LINE, paddingTop: 8 },
});

const na = "Not available";

function Monogram({ inverse }: { inverse?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Rect x={0} y={0} width={24} height={24} rx={6} fill={inverse ? NEON : GREEN} />
      <Rect x={7} y={5} width={3} height={14} fill="#03140a" />
      <Rect x={14} y={5} width={3} height={14} fill="#03140a" />
    </Svg>
  );
}

function Kpi({ label, value, delta, partial, text }: { label: string; value: number | null; delta?: number | null; partial?: boolean; text?: string }) {
  return (
    <View style={s.kpi}>
      <View style={s.kpiInner}>
        <Text style={s.kpiLabel}>{label.toUpperCase()}</Text>
        {text ? <Text style={s.kpiValue}>{text}</Text> : value === null ? <Text style={s.kpiNA}>{na}</Text> : <Text style={s.kpiValue}>{formatCompact(value)}{partial ? "*" : ""}</Text>}
        {delta !== undefined ? (
          <Text style={[s.kpiDelta, { color: delta === null ? SUBTLE : delta >= 0 ? GOOD : BAD }]}>{delta === null ? "— vs last month" : `${formatSignedPercent(delta)} vs last month`}</Text>
        ) : null}
      </View>
    </View>
  );
}

function H2({ n, children }: { n: string; children: string }) {
  return (
    <View style={s.h2row} minPresenceAhead={80}>
      <Text style={s.h2num}>{n}</Text>
      <Text style={s.h2}>{children}</Text>
    </View>
  );
}

/** Minimal SVG chart: bars (default) or area line. Null values are gaps, never zero. */
function MiniChart({ values, kind = "bar", width = 245, height = 92 }: { values: (number | null)[]; kind?: "bar" | "line"; width?: number; height?: number }) {
  const known = values.filter((v): v is number => v !== null);
  if (!known.length) {
    return (
      <View style={{ height, borderWidth: 1, borderColor: LINE, borderStyle: "dashed", borderRadius: 6, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 8, color: SUBTLE }}>{na}</Text>
      </View>
    );
  }
  const max = Math.max(...known, 0);
  const min = Math.min(...known, 0);
  const span = max - min || 1;
  const y = (v: number) => height - 4 - ((v - min) / span) * (height - 10);
  const zeroY = y(0);
  const n = values.length;
  const step = width / Math.max(n, 1);

  if (kind === "line") {
    let d = "";
    let area = "";
    let started = false;
    values.forEach((v, i) => {
      if (v === null) {
        started = false;
        return;
      }
      const x = i * step + step / 2;
      d += `${started ? "L" : "M"}${x.toFixed(1)},${y(v).toFixed(1)} `;
      started = true;
    });
    const pts = values.map((v, i) => (v === null ? null : [i * step + step / 2, y(v)] as const)).filter(Boolean) as (readonly [number, number])[];
    if (pts.length > 1) area = `M${pts[0]![0]},${zeroY} ` + pts.map(([x, yy]) => `L${x.toFixed(1)},${yy.toFixed(1)}`).join(" ") + ` L${pts.at(-1)![0]},${zeroY} Z`;
    return (
      <Svg width={width} height={height}>
        <Rect x={0} y={zeroY} width={width} height={0.6} fill={LINE} />
        {area ? <Path d={area} fill={GREEN} fillOpacity={0.12} /> : null}
        <Path d={d} stroke={GREEN} strokeWidth={1.6} fill="none" />
      </Svg>
    );
  }
  const bw = Math.max(1, step - (n > 40 ? 1 : 2));
  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={zeroY} width={width} height={0.6} fill={LINE} />
      {values.map((v, i) =>
        v === null ? null : (
          <Rect key={i} x={i * step + (step - bw) / 2} y={Math.min(y(v), zeroY)} width={bw} height={Math.max(0.6, Math.abs(zeroY - y(v)))} rx={Math.min(1.5, bw / 2)} fill={v < 0 ? "#b6c0b9" : GREEN} />
        ),
      )}
    </Svg>
  );
}

function ChartBlock({ title, values, kind, total }: { title: string; values: (number | null)[]; kind?: "bar" | "line"; total: string }) {
  return (
    <View style={s.chartBox} wrap={false}>
      <Text style={s.chartTitle}>{title}</Text>
      <MiniChart values={values} kind={kind} />
      <Text style={s.chartMeta}>{total}</Text>
    </View>
  );
}

export function ReportDocument({ data, thumbs }: { data: ReportData; thumbs: Record<string, Buffer | undefined> }) {
  const o = data.overview;
  const footer = (
    <View style={s.footer} fixed>
      <Text>Eleven Media · {data.client.name} · {formatMonth(data.month)}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
  const sum = (vals: (number | null)[]) => {
    const k = vals.filter((v): v is number => v !== null);
    return k.length ? k.reduce((a, b) => a + b, 0) : null;
  };

  return (
    <Document title={`${data.client.name} — ${formatMonth(data.month)} growth report`} author="Eleven Media" creator="Eleven Growth" producer="Eleven Growth">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <View style={s.brandRow}>
            <View style={s.brand}>
              <Monogram inverse />
              <Text style={s.brandText}>ELEVEN MEDIA</Text>
            </View>
          </View>
          <Text style={s.eyebrow}>MONTHLY GROWTH REPORT</Text>
          <Text style={s.title}>{data.client.name}</Text>
          <Text style={s.subtitle}>{[data.client.company, data.client.industry].filter(Boolean).join(" · ") || " "}</Text>
          <View style={s.metaRow}>
            <View style={s.metaCell}><Text style={s.metaLabel}>MONTH</Text><Text style={s.metaValue}>{formatMonth(data.month)}</Text></View>
            <View style={s.metaCell}><Text style={s.metaLabel}>PERIOD</Text><Text style={s.metaValue}>{formatDate(data.period.start)} – {formatDate(data.period.end)}</Text></View>
            <View style={s.metaCell}><Text style={s.metaLabel}>PREPARED</Text><Text style={s.metaValue}>{formatDate(data.generatedAt)}</Text></View>
          </View>
        </View>

        <H2 n="01">Monthly overview</H2>
        <View style={s.grid}>
          <Kpi label="Content published" value={o.published} delta={data.growth.published} />
          <Kpi label="Views" value={o.views.value} delta={data.growth.views} partial={o.views.partial} />
          <Kpi label="Subscribers gained" value={o.followersNet} delta={data.growth.followersNet} />
          <Kpi label="Engagements" value={o.engagements.value} delta={data.growth.engagements} partial={o.engagements.partial} />
          <Kpi label="Likes" value={o.likes.value} partial={o.likes.partial} />
          <Kpi label="Comments" value={o.comments.value} partial={o.comments.partial} />
          <Kpi label="Shares" value={o.shares.value} partial={o.shares.partial} />
          <Kpi label="Engagement rate" value={o.engagementRate} text={o.engagementRate === null ? undefined : formatPercent(o.engagementRate, 2)} />
        </View>
        <Text style={s.note}>
          Total subscribers: {o.followersTotal === null ? na : formatNumber(o.followersTotal)}
          {o.followersTotalAsOf ? ` (as of ${formatDate(o.followersTotalAsOf)})` : ""}. Subscribers gained is the channel-level net change for the month
          (gained {o.followersGained === null ? na : formatNumber(o.followersGained)}, lost {o.followersLost === null ? na : formatNumber(o.followersLost)}). Subscribers
          attributed to individual videos: {o.followersAttributed.value === null ? na : formatNumber(o.followersAttributed.value)}.
        </Text>

        <View style={{ marginTop: 22 }}>
          <H2 n="02">Growth trends</H2>
          <View style={[s.grid, { marginHorizontal: -6 }]}>
            <ChartBlock title="Views per day" kind="line" values={data.series.daily.map((d) => d.views)} total={`Total: ${formatNumber(sum(data.series.daily.map((d) => d.views)))}`} />
            <ChartBlock title="Engagements per day" values={data.series.daily.map((d) => d.engagements)} total={`Total: ${formatNumber(sum(data.series.daily.map((d) => d.engagements)))}`} />
          </View>
        </View>
        {footer}
      </Page>

      <Page size="A4" style={s.page}>
        <View style={[s.grid, { marginHorizontal: -6 }]}>
          <ChartBlock title="Net subscribers per day" values={data.series.daily.map((d) => d.followersNet)} total={`Net: ${o.followersNet === null ? na : formatNumber(o.followersNet)}`} />
          <ChartBlock title="Content output per week" values={data.series.weeklyOutput.map((w) => w.count)} total={data.series.weeklyOutput.map((w) => `${w.label}: ${w.count}`).join("   ")} />
        </View>

        <View style={{ marginTop: 22 }}>
          <H2 n="03">Platform performance</H2>
          <View style={s.table}>
            <View style={s.tr}>
              {["PLATFORM", "PUBLISHED", "VIEWS", "ENGAGEMENTS", "ENG. RATE", "NET SUBS"].map((h, i) => (
                <Text key={h} style={[s.th, { flex: i === 0 ? 1.6 : 1, textAlign: i === 0 ? "left" : "right" }]}>{h}</Text>
              ))}
            </View>
            {data.platforms.map((p) => (
              <View key={p.platform} style={s.tr}>
                <View style={{ flex: 1.6, flexDirection: "row", alignItems: "center" }}>
                  <Svg width={6} height={6}><Rect x={0} y={0} width={6} height={6} rx={3} fill={PLATFORM_COLORS[p.platform] ?? INK} /></Svg>
                  <Text style={[s.td, { marginLeft: 6, fontFamily: "Helvetica-Bold" }]}>{PLATFORM_LABELS[p.platform]}</Text>
                </View>
                <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{p.published}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{p.views.value === null ? na : formatNumber(p.views.value)}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{p.engagements.value === null ? na : formatNumber(p.engagements.value)}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{p.engagementRate === null ? na : formatPercent(p.engagementRate, 2)}</Text>
                <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{p.followersNet === null ? na : `${p.followersNet > 0 ? "+" : ""}${formatNumber(p.followersNet)}`}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 22 }}>
          <H2 n="04">Top content</H2>
          {data.topContent.length === 0 ? <Text style={s.note}>No content with view data this month.</Text> : null}
          {data.topContent.map((c, i) => (
            <View key={c.id} style={s.topRow} wrap={false}>
              <Text style={{ width: 16, fontFamily: "Courier", fontSize: 8, color: SUBTLE }}>{i + 1}</Text>
              {thumbs[c.id] ? <Image src={thumbs[c.id]!} style={s.thumb} /> : <View style={[s.thumb, { justifyContent: "center", alignItems: "center" }]}><Text style={{ fontSize: 7, color: SUBTLE }}>{PLATFORM_LABELS[c.platform]}</Text></View>}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Link src={c.url} style={{ color: INK, textDecoration: "none" }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5 }}>{(c.title ?? c.url).slice(0, 90)}</Text>
                </Link>
                <Text style={{ fontSize: 7.5, color: SUBTLE, marginTop: 3 }}>{PLATFORM_LABELS[c.platform]} · {formatDate(c.published_at)}</Text>
              </View>
              {[["VIEWS", c.views], ["LIKES", c.likes], ["COMMENTS", c.comments], ["SHARES", c.shares]].map(([k, v]) => (
                <View key={k as string} style={{ width: 52, alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 6.5, color: SUBTLE, letterSpacing: 0.8 }}>{k as string}</Text>
                  <Text style={{ fontFamily: v === null ? "Helvetica" : "Helvetica-Bold", fontSize: v === null ? 7 : 10, color: v === null ? SUBTLE : INK, marginTop: 2 }}>
                    {v === null ? na : `${formatCompact(v as number)}${c.partial ? "*" : ""}`}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        {footer}
      </Page>

      <Page size="A4" style={s.page}>
        <H2 n="05">Content delivery summary</H2>
        <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 12 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 36 }}>{data.delivery.total}</Text>
          <Text style={{ fontSize: 10, color: MUTED, marginLeft: 10, marginBottom: 6 }}>pieces of content published in {formatMonth(data.month)}</Text>
        </View>
        <Text style={{ fontSize: 9, color: MUTED, marginBottom: 10 }}>
          {data.delivery.byPlatform.map((p) => `${PLATFORM_LABELS[p.platform]}: ${p.count}`).join("   ·   ") || "No content published this month."}
        </Text>
        {data.delivery.items.length ? (
          <View style={s.table}>
            {data.delivery.items.map((it, i) => (
              <View key={i} style={s.tr} wrap={false}>
                <Text style={[s.td, { flex: 1 }]}>{(it.title ?? it.url).slice(0, 95)}</Text>
                <Text style={[s.td, { width: 70, color: MUTED }]}>{PLATFORM_LABELS[it.platform]}</Text>
                <Text style={[s.td, { width: 56, textAlign: "right", color: MUTED }]}>{formatDate(it.published_at, { day: "numeric", month: "short" })}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 26 }}>
          <H2 n="06">Notes on the data</H2>
          {[...data.notes, "Values marked * are lower bounds (tracking began mid-month for some content).", "All figures are derived from daily snapshots collected via official platform APIs. Metrics a platform does not provide are shown as “Not available” and are never estimated."].map((n) => (
            <Text key={n} style={[s.note, { marginTop: 4 }]}>•  {n}</Text>
          ))}
        </View>
        <View style={{ marginTop: 34, flexDirection: "row", alignItems: "center" }}>
          <Monogram />
          <Text style={{ marginLeft: 8, fontSize: 8.5, color: MUTED }}>Prepared by Eleven Media with Eleven Growth.</Text>
        </View>
        {footer}
      </Page>
    </Document>
  );
}

async function fetchThumb(url: string): Promise<Buffer | undefined> {
  try {
    // react-pdf supports JPEG/PNG only; YouTube serves JPEG at these paths.
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return undefined;
    const type = res.headers.get("content-type") ?? "";
    if (!/jpe?g|png/.test(type)) return undefined;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return undefined;
  }
}

export async function renderReportPdf(data: ReportData): Promise<Buffer> {
  const entries = await Promise.all(data.topContent.map(async (c) => [c.id, c.thumbnail_url ? await fetchThumb(c.thumbnail_url) : undefined] as const));
  return renderToBuffer(<ReportDocument data={data} thumbs={Object.fromEntries(entries)} />);
}
