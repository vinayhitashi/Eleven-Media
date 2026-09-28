import "server-only";
/**
 * Sync orchestration. Runs with the service role (bypasses RLS) and is only
 * reachable from: the cron route (CRON_SECRET), the OAuth callback, and
 * admin-authorised server actions.
 *
 * Each run writes ONE cumulative snapshot per content per UTC day (upsert), so
 * running it multiple times a day is safe and history accumulates over time.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import { today } from "@/lib/dates";
import { getAdapter } from "@/platforms/registry";
import type { ContentMetricsResult, TokenSet } from "@/platforms/types";
import type { Platform, SocialAccount } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

export interface SyncOutcome {
  accountId: string;
  status: "success" | "partial" | "failed";
  itemsSynced: number;
  warnings: string[];
  error?: string;
}

export async function storeTokens(admin: Admin, socialAccountId: string, tokens: TokenSet) {
  const { error } = await admin.from("social_account_tokens").upsert({
    social_account_id: socialAccountId,
    access_token_encrypted: encrypt(tokens.accessToken),
    refresh_token_encrypted: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    token_expires_at: tokens.expiresAt?.toISOString() ?? null,
  });
  if (error) throw new Error(`Could not store tokens: ${error.message}`);
}

/** Returns a non-expired access token, refreshing (and persisting) when needed. */
export async function getValidTokens(admin: Admin, account: Pick<SocialAccount, "id" | "platform">): Promise<TokenSet> {
  const { data, error } = await admin
    .from("social_account_tokens")
    .select("access_token_encrypted, refresh_token_encrypted, token_expires_at")
    .eq("social_account_id", account.id)
    .maybeSingle();
  if (error || !data) throw new Error("No stored credentials — reconnect this account.");

  const tokens: TokenSet = {
    accessToken: decrypt(data.access_token_encrypted),
    refreshToken: data.refresh_token_encrypted ? decrypt(data.refresh_token_encrypted) : null,
    expiresAt: data.token_expires_at ? new Date(data.token_expires_at) : null,
    scopes: [],
  };
  const expiresSoon = !tokens.expiresAt || tokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  if (!expiresSoon) return tokens;

  const adapter = getAdapter(account.platform);
  if (!adapter.auth || !tokens.refreshToken) throw new Error("Access expired and no refresh token is available — reconnect this account.");
  const refreshed = await adapter.auth.refresh(tokens.refreshToken);
  await storeTokens(admin, account.id, refreshed);
  return refreshed;
}

export async function writeContentSnapshots(
  admin: Admin,
  rows: { contentId: string; clientId: string; metrics: ContentMetricsResult }[],
) {
  if (rows.length === 0) return;
  const day = today();
  const { error } = await admin.from("content_metrics").upsert(
    rows.map(({ contentId, clientId, metrics }) => ({
      content_id: contentId,
      client_id: clientId,
      recorded_on: day,
      recorded_at: new Date().toISOString(),
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      followers_gained: metrics.followersGained,
      source: metrics.source,
    })),
    { onConflict: "content_id,recorded_on" },
  );
  if (error) throw new Error(`Could not write snapshots: ${error.message}`);
}

export async function syncSocialAccount(accountId: string, trigger: "cron" | "manual" | "connect" = "manual"): Promise<SyncOutcome> {
  const admin = createAdminClient();
  const { data: account, error } = await admin.from("social_accounts").select("*").eq("id", accountId).maybeSingle<SocialAccount>();
  if (error || !account) return { accountId, status: "failed", itemsSynced: 0, warnings: [], error: "Account not found" };

  const adapter = getAdapter(account.platform);
  const { data: run } = await admin
    .from("sync_runs")
    .insert({ social_account_id: account.id, platform: account.platform, trigger })
    .select("id")
    .single();

  const finish = async (outcome: SyncOutcome) => {
    await admin
      .from("sync_runs")
      .update({ status: outcome.status, items_synced: outcome.itemsSynced, warnings: outcome.warnings, error: outcome.error ?? null, finished_at: new Date().toISOString() })
      .eq("id", run?.id ?? -1);
    await admin
      .from("social_accounts")
      .update({
        last_synced_at: outcome.status === "failed" ? account.last_synced_at : new Date().toISOString(),
        last_sync_error: outcome.error ?? (outcome.warnings.length ? outcome.warnings.join(" · ") : null),
        ...(outcome.status === "failed" && /reconnect|expired|invalid_grant/i.test(outcome.error ?? "") ? { status: "expired" } : {}),
      })
      .eq("id", account.id);
    return outcome;
  };

  if (!adapter.syncAccount) {
    return finish({ accountId, status: "failed", itemsSynced: 0, warnings: [], error: `${adapter.label} sync is not available yet.` });
  }

  try {
    const tokens = await getValidTokens(admin, account);
    const { data: contentRows } = await admin
      .from("content")
      .select("id, client_id, platform_content_id, title, thumbnail_url, published_at")
      .eq("social_account_id", account.id)
      .not("platform_content_id", "is", null);
    const items = (contentRows ?? []) as { id: string; client_id: string; platform_content_id: string; title: string | null; thumbnail_url: string | null; published_at: string | null }[];

    // Content with no stored history yet gets its past days backfilled from the official API.
    const withHistory = new Set<string>();
    for (let i = 0; i < items.length; i += 200) {
      const { data: hist } = await admin
        .from("content_metrics")
        .select("content_id")
        .in("content_id", items.slice(i, i + 200).map((c) => c.id))
        .lt("recorded_on", today());
      for (const h of (hist ?? []) as { content_id: string }[]) withHistory.add(h.content_id);
    }

    const result = await adapter.syncAccount(
      { tokens, platformAccountId: account.platform_account_id },
      {
        contentIds: items.map((c) => c.platform_content_id),
        backfillDays: account.last_synced_at ? 14 : 90,
        historyContentIds: items.filter((c) => !withHistory.has(c.id)).map((c) => c.platform_content_id),
      },
    );

    // Account profile
    await admin
      .from("social_accounts")
      .update({ account_name: result.account.name, account_handle: result.account.handle, avatar_url: result.account.avatarUrl, status: "connected" })
      .eq("id", account.id);

    // Account-level history: daily flows, then today's point-in-time total (separate upserts so
    // neither overwrites the other's columns).
    if (result.daily.length) {
      const { error: dErr } = await admin.from("account_metrics").upsert(
        result.daily.map((d) => ({
          social_account_id: account.id,
          client_id: account.client_id,
          platform: account.platform,
          recorded_on: d.date,
          followers_gained: d.followersGained,
          followers_lost: d.followersLost,
          views: d.views,
          source: `${account.platform}_analytics`,
        })),
        { onConflict: "social_account_id,recorded_on" },
      );
      if (dErr) result.warnings.push(`Daily account metrics not saved: ${dErr.message}`);
    }
    if (result.account.followersTotal !== null) {
      await admin.from("account_metrics").upsert(
        {
          social_account_id: account.id,
          client_id: account.client_id,
          platform: account.platform,
          recorded_on: today(),
          followers_total: result.account.followersTotal,
          source: `${account.platform}_public_stats`,
        },
        { onConflict: "social_account_id,recorded_on" },
      );
    }

    // Content details (title/thumbnail may change) + snapshots
    const byPlatformId = new Map(items.map((c) => [c.platform_content_id, c]));
    for (const d of result.contentDetails) {
      const row = byPlatformId.get(d.contentId);
      if (!row) continue;
      if (row.title !== d.title || row.thumbnail_url !== d.thumbnailUrl || (!row.published_at && d.publishedAt)) {
        await admin.from("content").update({ title: d.title, thumbnail_url: d.thumbnailUrl, published_at: d.publishedAt ?? row.published_at }).eq("id", row.id);
      }
    }
    const snapshots = result.contentMetrics
      .map((m) => ({ row: byPlatformId.get(m.contentId), m }))
      .filter((x): x is { row: (typeof items)[number]; m: ContentMetricsResult } => Boolean(x.row))
      .map(({ row, m }) => ({ contentId: row.id, clientId: row.client_id, metrics: m }));
    await writeContentSnapshots(admin, snapshots);

    // Historical backfill rows never overwrite snapshots that were actually collected.
    const history = (result.contentHistory ?? [])
      .filter((h) => h.date < today() && byPlatformId.has(h.contentId))
      .map((h) => {
        const row = byPlatformId.get(h.contentId)!;
        return {
          content_id: row.id,
          client_id: row.client_id,
          recorded_on: h.date,
          views: h.views,
          likes: h.likes,
          comments: h.comments,
          shares: h.shares,
          followers_gained: h.followersGained,
          source: `${account.platform}_analytics_backfill`,
        };
      });
    for (let i = 0; i < history.length; i += 500) {
      const { error: hErr } = await admin.from("content_metrics").upsert(history.slice(i, i + 500), { onConflict: "content_id,recorded_on", ignoreDuplicates: true });
      if (hErr) {
        result.warnings.push(`History backfill not saved: ${hErr.message}`);
        break;
      }
    }

    const syncedIds = new Set(snapshots.map((s) => s.contentId));
    if (syncedIds.size) await admin.from("content").update({ metrics_status: "ok", last_synced_at: new Date().toISOString() }).in("id", [...syncedIds]);
    const missing = items.filter((c) => !syncedIds.has(c.id)).map((c) => c.id);
    if (missing.length) await admin.from("content").update({ metrics_status: "error" }).in("id", missing);

    return finish({ accountId, status: result.warnings.length ? "partial" : "success", itemsSynced: snapshots.length, warnings: result.warnings });
  } catch (err) {
    return finish({ accountId, status: "failed", itemsSynced: 0, warnings: [], error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * Content that isn't linked to a connected account (e.g. a public video pasted
 * by URL): collect only what the platform exposes publicly. Shares and attributed
 * followers stay null ("Not available").
 */
export async function syncPublicContent(platform: Platform = "youtube", contentIds?: string[]): Promise<number> {
  const adapter = getAdapter(platform);
  if (!adapter.fetchPublicMetrics) return 0;
  const admin = createAdminClient();
  let q = admin.from("content").select("id, client_id, platform_content_id").eq("platform", platform).is("social_account_id", null).not("platform_content_id", "is", null);
  if (contentIds) q = q.in("id", contentIds);
  const { data } = await q;
  const rows = (data ?? []) as { id: string; client_id: string; platform_content_id: string }[];
  if (!rows.length) return 0;

  const metrics = await adapter.fetchPublicMetrics(rows.map((r) => r.platform_content_id));
  const byId = new Map(metrics.map((m) => [m.contentId, m]));
  const snapshots = rows.filter((r) => byId.has(r.platform_content_id)).map((r) => ({ contentId: r.id, clientId: r.client_id, metrics: byId.get(r.platform_content_id)! }));
  await writeContentSnapshots(admin, snapshots);
  if (snapshots.length) await admin.from("content").update({ metrics_status: "ok", last_synced_at: new Date().toISOString() }).in("id", snapshots.map((s) => s.contentId));
  return snapshots.length;
}

export async function syncAll(trigger: "cron" | "manual" = "cron") {
  const admin = createAdminClient();
  const { data } = await admin.from("social_accounts").select("id, platform, clients!inner(status)").eq("status", "connected").eq("clients.status", "active");
  const outcomes: SyncOutcome[] = [];
  for (const acc of (data ?? []) as { id: string; platform: Platform }[]) {
    if (getAdapter(acc.platform).status !== "available") continue;
    outcomes.push(await syncSocialAccount(acc.id, trigger));
  }
  let publicSynced = 0;
  try {
    publicSynced = await syncPublicContent("youtube");
  } catch (err) {
    outcomes.push({ accountId: "public:youtube", status: "failed", itemsSynced: 0, warnings: [], error: err instanceof Error ? err.message : String(err) });
  }
  return { outcomes, publicSynced };
}

/**
 * Imports the channel's most recent uploads into the client's library (skipping
 * anything already tracked). Returns the number of new items.
 */
export async function importRecentContent(accountId: string, createdBy: string | null, limit = 25): Promise<number> {
  const admin = createAdminClient();
  const { data: acc } = await admin.from("social_accounts").select("*").eq("id", accountId).maybeSingle<SocialAccount>();
  if (!acc) throw new Error("Account not found.");
  const adapter = getAdapter(acc.platform);
  if (!adapter.listRecentContent) throw new Error(`${adapter.label} import is not available yet.`);
  const tokens = await getValidTokens(admin, acc);
  const recent = await adapter.listRecentContent({ tokens, platformAccountId: acc.platform_account_id }, limit);
  const { data: existing } = await admin.from("content").select("platform_content_id").eq("client_id", acc.client_id).eq("platform", acc.platform);
  const have = new Set(((existing ?? []) as { platform_content_id: string | null }[]).map((e) => e.platform_content_id));
  const fresh = recent
    .filter((d) => !have.has(d.contentId))
    .map((d) => {
      const parsed = adapter.parseUrl(`https://www.youtube.com/watch?v=${d.contentId}`);
      return {
        client_id: acc.client_id,
        social_account_id: acc.id,
        platform: acc.platform,
        platform_content_id: d.contentId,
        url: d.contentType === "short" ? `https://www.youtube.com/shorts/${d.contentId}` : (parsed?.url ?? `https://www.youtube.com/watch?v=${d.contentId}`),
        title: d.title,
        thumbnail_url: d.thumbnailUrl,
        content_type: d.contentType,
        published_at: d.publishedAt,
        metrics_status: "pending",
        created_by: createdBy,
      };
    });
  if (fresh.length) {
    const { error } = await admin.from("content").insert(fresh);
    if (error) throw new Error(error.message);
  }
  return fresh.length;
}
