import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { assertClientAccess, getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { importRecentContent, storeTokens, syncSocialAccount } from "@/lib/sync/run";
import { getAdapter, isPlatform } from "@/platforms/registry";
import { OAUTH_COOKIE } from "@/lib/oauth";

export const maxDuration = 300;

export async function GET(request: NextRequest, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  const raw = request.cookies.get(OAUTH_COOKIE)?.value;
  let saved: { state: string; clientId: string; platform: string; returnTo: string } | null = null;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }
  const returnTo = saved?.returnTo ?? "/integrations";
  const done = (q: string) => {
    const res = NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}${q}`, env.siteUrl));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/integrations" });
    return res;
  };

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return done(`error=${encodeURIComponent(params.get("error")!)}`);

  // CSRF: the state must match the httpOnly cookie set when the flow started.
  const state = params.get("state") ?? "";
  if (!saved || saved.platform !== platform || !isPlatform(platform) || state.length !== saved.state.length || !timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))) {
    return done("error=invalid_state");
  }
  const viewer = await getViewer();
  if (!viewer) return done("error=signed_out");
  try {
    await assertClientAccess(saved.clientId);
  } catch {
    return done("error=forbidden");
  }

  const adapter = getAdapter(platform);
  if (!adapter.auth) return done("error=unsupported");

  try {
    const redirectUri = `${env.siteUrl}/api/integrations/${platform}/callback`;
    const tokens = await adapter.auth.exchangeCode(params.get("code") ?? "", redirectUri);
    const account = await adapter.auth.getAccount(tokens);
    const admin = createAdminClient();

    const { data: row, error } = await admin
      .from("social_accounts")
      .upsert(
        {
          client_id: saved.clientId,
          platform,
          platform_account_id: account.platformAccountId,
          account_name: account.name,
          account_handle: account.handle,
          avatar_url: account.avatarUrl,
          status: "connected",
          scopes: tokens.scopes,
          connected_by: viewer.id,
          last_sync_error: null,
        },
        { onConflict: "client_id,platform,platform_account_id" },
      )
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not save account");
    await storeTokens(admin, row.id, tokens);

    // Link already-catalogued content that belongs to this channel.
    if (adapter.fetchContentDetails) {
      const { data: unlinked } = await admin
        .from("content")
        .select("id, platform_content_id")
        .eq("client_id", saved.clientId)
        .eq("platform", platform)
        .is("social_account_id", null)
        .not("platform_content_id", "is", null);
      const list = (unlinked ?? []) as { id: string; platform_content_id: string }[];
      if (list.length) {
        const details = await adapter.fetchContentDetails(list.map((c) => c.platform_content_id), tokens);
        const owned = new Set(details.filter((d) => d.accountId === account.platformAccountId).map((d) => d.contentId));
        const ids = list.filter((c) => owned.has(c.platform_content_id)).map((c) => c.id);
        if (ids.length) await admin.from("content").update({ social_account_id: row.id }).in("id", ids);
      }
    }

    // First connection with an empty library: pull in the channel's recent uploads so the
    // dashboard shows real performance (with backfilled daily history) straight away.
    const { count: existingCount } = await admin.from("content").select("id", { count: "exact", head: true }).eq("social_account_id", row.id);
    if (!existingCount) {
      try {
        await importRecentContent(row.id, viewer.id, 25);
      } catch (err) {
        console.error("[oauth callback] import failed", err);
      }
    }

    const outcome = await syncSocialAccount(row.id, "connect");
    const missingAnalytics = platform === "youtube" && tokens.scopes.length > 0 && !tokens.scopes.some((s) => s.includes("yt-analytics"));
    return done(`connected=${platform}${missingAnalytics ? "&warning=analytics_scope_missing" : ""}${outcome.status === "failed" ? "&warning=initial_sync_failed" : ""}`);
  } catch (err) {
    console.error("[oauth callback]", err);
    return done(`error=${encodeURIComponent(err instanceof Error ? err.message.slice(0, 180) : "connection_failed")}`);
  }
}
