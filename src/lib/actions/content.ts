"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidTokens, importRecentContent, syncPublicContent, syncSocialAccount } from "@/lib/sync/run";
import { detectContentUrl, getAdapter } from "@/platforms/registry";
import type { ContentDetails, TokenSet } from "@/platforms/types";
import type { ActionState, SocialAccount } from "@/lib/types";
import { setupGuard, str, toActionError } from "./_shared";

/**
 * Adds a pasted URL to the content library:
 *   detect platform → extract content id → look up official metadata → store → first snapshot.
 * Never scrapes. Platforms without a live integration are catalogued with metrics "Not available".
 */
export async function addContentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    const viewer = await assertAdmin();
    const input = z
      .object({
        clientId: z.string().uuid("Choose a client"),
        url: z.string().min(4, "Paste a content URL").max(2000),
        title: z.string().max(300).optional(),
        publishedAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
      })
      .safeParse({ clientId: str(fd, "clientId"), url: str(fd, "url"), title: str(fd, "title"), publishedAt: str(fd, "publishedAt") });
    if (!input.success) return { error: input.error.issues[0]?.message ?? "Invalid input" };
    const { clientId, url, title, publishedAt } = input.data;

    const parsed = detectContentUrl(url);
    if (!parsed) return { error: "Unsupported link. Paste a YouTube, Instagram, TikTok, Facebook or LinkedIn content URL." };
    if (!parsed.contentId && parsed.platform === "youtube") return { error: "That YouTube link isn't a video. Paste a video or Shorts URL." };

    const adapter = getAdapter(parsed.platform);
    const admin = createAdminClient();
    let details: ContentDetails | null = null;
    let linkedAccount: Pick<SocialAccount, "id" | "platform_account_id"> | null = null;

    if (adapter.status === "available" && adapter.fetchContentDetails && parsed.contentId) {
      const { data: accounts } = await admin
        .from("social_accounts")
        .select("id, platform, platform_account_id")
        .eq("client_id", clientId)
        .eq("platform", parsed.platform)
        .eq("status", "connected");
      const accs = (accounts ?? []) as Pick<SocialAccount, "id" | "platform" | "platform_account_id">[];
      let tokens: TokenSet | null = null;
      if (accs[0]) {
        try {
          tokens = await getValidTokens(admin, accs[0]);
        } catch {
          tokens = null;
        }
      }
      try {
        [details = null] = await adapter.fetchContentDetails([parsed.contentId], tokens);
      } catch (err) {
        return { error: `Couldn't look up this content via the ${adapter.label} API: ${err instanceof Error ? err.message : "unknown error"}` };
      }
      if (!details) return { error: `${adapter.label} did not return this content — it may be private, deleted or mistyped.` };
      linkedAccount = accs.find((a) => a.platform_account_id === details!.accountId) ?? null;
    }

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("content")
      .insert({
        client_id: clientId,
        social_account_id: linkedAccount?.id ?? null,
        platform: parsed.platform,
        platform_content_id: parsed.contentId,
        url: parsed.url,
        title: details?.title ?? (title || null),
        thumbnail_url: details?.thumbnailUrl ?? null,
        content_type: details?.contentType ?? parsed.contentType ?? null,
        published_at: details?.publishedAt ?? (publishedAt ? `${publishedAt}T00:00:00Z` : null),
        metrics_status: adapter.status === "available" ? "pending" : "unavailable",
        created_by: viewer.id,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { error: "This content is already in the client's library." };
      throw new Error(error.message);
    }

    // First snapshot (best effort — the daily job will retry).
    let note = "";
    try {
      if (linkedAccount) await syncSocialAccount(linkedAccount.id, "manual");
      else if (adapter.status === "available") {
        const n = await syncPublicContent(parsed.platform, [row.id]);
        note = n ? " Public stats collected — connect the channel for shares and subscriber data." : "";
      } else note = ` ${adapter.label} metrics are Not available until its official API integration ships.`;
    } catch {
      note = " Metrics will be collected on the next sync.";
    }

    revalidatePath("/content");
    revalidatePath(`/clients/${clientId}`);
    return { message: `Added “${details?.title ?? title ?? parsed.url}”.${note}` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteContentAction(id: string): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("content").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/content");
    return { message: "Content removed (its metric history was deleted too)." };
  } catch (err) {
    return toActionError(err);
  }
}

/** Imports the channel's most recent uploads into the library (skips existing), then syncs. */
export async function importRecentContentAction(accountId: string): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    const viewer = await assertAdmin();
    const added = await importRecentContent(accountId, viewer.id);
    if (added) await syncSocialAccount(accountId, "manual");
    revalidatePath("/content");
    revalidatePath("/dashboard");
    return { message: added ? `Imported ${added} new item(s) with their recent history.` : "Library is already up to date." };
  } catch (err) {
    return toActionError(err);
  }
}
