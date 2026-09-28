import "server-only";
/**
 * Data access layer. Every read goes through the signed-in user's Supabase
 * client, so Row Level Security applies on top of the explicit scoping here.
 */
import { compare, type AnalyticsComparison, type EngineInput } from "@/lib/analytics/engine";
import { previousRange, type DateRange } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { scopeClientIds } from "@/lib/auth";
import type { ReportData } from "@/lib/reports/build";
import type {
  AccountMetricDay,
  AppUser,
  Client,
  ClientSummary,
  Content,
  ContentMetricSnapshot,
  ContentWithLatest,
  Invitation,
  Platform,
  ReportRow,
  SocialAccount,
  Viewer,
} from "@/lib/types";

type Supa = Awaited<ReturnType<typeof createClient>>;

const inScope = (ids: string[] | null, id: string) => ids === null || ids.includes(id);

/** PostgREST caps responses (default 1000 rows) — page through large result sets. */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

// ─── Clients ────────────────────────────────────────────────────────────

export async function listClients(viewer: Viewer, opts: { status?: "active" | "archived" | "all" } = {}): Promise<ClientSummary[]> {
  const status = opts.status ?? "active";
  const scope = scopeClientIds(viewer);
  const supabase = await createClient();
  let q = supabase
    .from("clients")
    .select("*, content(count), social_accounts(platform, status, last_synced_at)")
    .order("name");
  if (status !== "all") q = q.eq("status", status);
  if (scope) q = scope.length ? q.in("id", scope) : q.in("id", ["00000000-0000-0000-0000-000000000000"]);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: unknown) => {
    const { content, social_accounts, ...client } = row as Client & {
      content: { count: number }[];
      social_accounts: Pick<SocialAccount, "platform" | "status" | "last_synced_at">[];
    };
    return {
      ...(client as Client),
      content_count: content?.[0]?.count ?? 0,
      platforms: [...new Set((social_accounts ?? []).filter((a) => a.status === "connected").map((a) => a.platform))],
      last_synced_at: (social_accounts ?? []).map((a) => a.last_synced_at).filter(Boolean).sort().at(-1) ?? null,
    };
  });
}

export async function getClient(viewer: Viewer, id: string): Promise<Client | null> {
  if (!inScope(scopeClientIds(viewer), id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>();
  return data;
}

export async function getOverviewCounts(viewer: Viewer): Promise<{ clients: number; content: number; accounts: number; reports: number }> {
  const supabase = await createClient();
  void viewer; // scoping is enforced by RLS for these counts
  const [clients, content, accounts, reports] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("content").select("id", { count: "exact", head: true }),
    supabase.from("social_accounts").select("id", { count: "exact", head: true }).eq("status", "connected"),
    supabase.from("reports").select("id", { count: "exact", head: true }),
  ]);
  return { clients: clients.count ?? 0, content: content.count ?? 0, accounts: accounts.count ?? 0, reports: reports.count ?? 0 };
}

// ─── Social accounts ────────────────────────────────────────────────────

export type SocialAccountWithClient = SocialAccount & { client_name: string };

export async function listSocialAccounts(viewer: Viewer, clientId?: string | null): Promise<SocialAccountWithClient[]> {
  const scope = scopeClientIds(viewer, clientId);
  if (scope && scope.length === 0) return [];
  const supabase = await createClient();
  let q = supabase
    .from("social_accounts")
    .select("id, client_id, platform, platform_account_id, account_name, account_handle, avatar_url, status, scopes, last_synced_at, last_sync_error, created_at, clients(name)")
    .order("created_at", { ascending: false });
  if (scope) q = q.in("client_id", scope);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: unknown) => {
    const { clients, ...rest } = row as SocialAccount & { clients: { name: string } | null };
    return { ...(rest as SocialAccount), client_name: clients?.name ?? "" };
  });
}

// ─── Content ────────────────────────────────────────────────────────────

export async function listContent(
  viewer: Viewer,
  opts: { clientId?: string | null; platform?: Platform | null; q?: string | null; limit?: number } = {},
): Promise<ContentWithLatest[]> {
  const scope = scopeClientIds(viewer, opts.clientId);
  const limit = opts.limit ?? 500;
  const needle = opts.q?.trim().toLowerCase();


  if (scope && scope.length === 0) return [];
  const supabase = await createClient();
  let q = supabase.from("content").select("*, clients(name)").order("published_at", { ascending: false, nullsFirst: false }).limit(limit);
  if (scope) q = q.in("client_id", scope);
  if (opts.platform) q = q.eq("platform", opts.platform);
  if (needle) q = q.or(`title.ilike.%${needle.replace(/[%,()]/g, "")}%,url.ilike.%${needle.replace(/[%,()]/g, "")}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as (Content & { clients: { name: string } | null })[];
  const ids = rows.map((r) => r.id);
  const latest = new Map<string, ContentMetricSnapshot>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: m } = await supabase.from("content_latest_metrics").select("*").in("content_id", ids.slice(i, i + 200));
    for (const s of (m ?? []) as ContentMetricSnapshot[]) latest.set(s.content_id, s);
  }
  return rows.map(({ clients, ...c }) => ({ ...c, client_name: clients?.name, latest: latest.get(c.id) ?? null }));
}

// ─── Analytics ──────────────────────────────────────────────────────────

/** Loads everything the engine needs for [start, end] (+ baselines before start). */
export async function loadEngineInput(viewer: Viewer, opts: { clientId?: string | null; platform?: Platform | null; start: string; end: string }): Promise<EngineInput> {
  const scope = scopeClientIds(viewer, opts.clientId);


  if (scope && scope.length === 0) return { contents: [], snapshots: [], accountDays: [] };
  const supabase: Supa = await createClient();

  const contents = await fetchAll<EngineInput["contents"][number]>((from, to) => {
    let q = supabase.from("content").select("id, client_id, platform, title, url, thumbnail_url, published_at, social_account_id, content_type").order("id");
    if (scope) q = q.in("client_id", scope);
    if (opts.platform) q = q.eq("platform", opts.platform);
    return q.range(from, to);
  });
  const ids = new Set(contents.map((c) => c.id));

  const snapshots = await fetchAll<ContentMetricSnapshot>((from, to) => {
    let q = supabase
      .from("content_metrics")
      .select("content_id, recorded_on, views, likes, comments, shares, followers_gained")
      .gte("recorded_on", opts.start)
      .lte("recorded_on", opts.end)
      .order("id");
    if (scope) q = q.in("client_id", scope);
    return q.range(from, to);
  });
  const { data: baselines, error: bErr } = await supabase.rpc("content_metric_baselines", { p_before: opts.start, p_client_ids: scope });
  if (bErr) throw new Error(bErr.message);

  const accountDays = await fetchAll<AccountMetricDay>((from, to) => {
    let q = supabase
      .from("account_metrics")
      .select("social_account_id, client_id, platform, recorded_on, followers_total, followers_gained, followers_lost, views")
      .lte("recorded_on", opts.end)
      .gte("recorded_on", opts.start)
      .order("id");
    if (scope) q = q.in("client_id", scope);
    if (opts.platform) q = q.eq("platform", opts.platform);
    return q.range(from, to);
  });
  // Latest known follower total before the window (point-in-time baseline).
  let tq = supabase
    .from("account_metrics")
    .select("social_account_id, client_id, platform, recorded_on, followers_total, followers_gained, followers_lost, views")
    .lt("recorded_on", opts.start)
    .not("followers_total", "is", null)
    .order("recorded_on", { ascending: false })
    .limit(200);
  if (scope) tq = tq.in("client_id", scope);
  if (opts.platform) tq = tq.eq("platform", opts.platform);
  const { data: totalsBefore } = await tq;
  const seen = new Set<string>();
  const priorTotals = ((totalsBefore ?? []) as AccountMetricDay[])
    .filter((r) => (seen.has(r.social_account_id) ? false : (seen.add(r.social_account_id), true)))
    .map((r) => ({ ...r, followers_gained: null, followers_lost: null }));

  return {
    contents,
    snapshots: [...((baselines ?? []) as ContentMetricSnapshot[]).filter((s) => ids.has(s.content_id)), ...snapshots.filter((s) => ids.has(s.content_id))],
    accountDays: [...priorTotals, ...accountDays],
  };
}

export interface AnalyticsResult extends AnalyticsComparison {
  range: DateRange;
  previousRange: DateRange;
}

export async function getAnalytics(viewer: Viewer, opts: { clientId?: string | null; platform?: Platform | null; range: DateRange }): Promise<AnalyticsResult> {
  const prev = previousRange(opts.range);
  const input = await loadEngineInput(viewer, { clientId: opts.clientId, platform: opts.platform, start: prev.start, end: opts.range.end });
  return { ...compare(input, opts.range, prev), range: opts.range, previousRange: prev };
}

// ─── Reports ────────────────────────────────────────────────────────────

export type ReportListItem = Omit<ReportRow, "data"> & { client_name: string };

export async function listReports(viewer: Viewer, clientId?: string | null): Promise<ReportListItem[]> {
  const scope = scopeClientIds(viewer, clientId);
  if (scope && scope.length === 0) return [];
  const supabase = await createClient();
  let q = supabase
    .from("reports")
    .select("id, client_id, month, status, total_posts, total_views, followers_gained, pdf_url, created_at, updated_at, clients(name)")
    .order("month", { ascending: false });
  if (scope) q = q.in("client_id", scope);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: unknown) => {
    const { clients, ...r } = row as ReportListItem & { clients: { name: string } | null };
    return { ...r, client_name: clients?.name ?? "" };
  });
}

export async function getReport(viewer: Viewer, id: string): Promise<(Omit<ReportRow, "data"> & { client_name: string; data: ReportData }) | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("reports").select("*, clients(name)").eq("id", id).maybeSingle();
  if (!data) return null;
  const { clients, ...r } = data as ReportRow & { clients: { name: string } | null };
  if (!inScope(scopeClientIds(viewer), r.client_id)) return null;
  return { ...r, client_name: clients?.name ?? "", data: r.data as ReportData };
}

// ─── Client team ────────────────────────────────────────────────────────

export async function listClientTeam(viewer: Viewer, clientId: string): Promise<{ users: AppUser[]; invitations: Invitation[] }> {
  if (viewer.role !== "admin") return { users: [], invitations: [] };
  const supabase = await createClient();
  const [users, invites] = await Promise.all([
    supabase.from("users").select("id, name, email, role, client_id, created_at").eq("client_id", clientId).order("created_at"),
    supabase.from("invitations").select("*").eq("client_id", clientId).is("accepted_at", null).order("created_at", { ascending: false }),
  ]);
  return { users: (users.data ?? []) as AppUser[], invitations: (invites.data ?? []) as Invitation[] };
}

export async function listAdmins(viewer: Viewer): Promise<AppUser[]> {
  if (viewer.role !== "admin") return [];
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("id, name, email, role, client_id, created_at").eq("role", "admin").order("created_at");
  return (data ?? []) as AppUser[];
}
