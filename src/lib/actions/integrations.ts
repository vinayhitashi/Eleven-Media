"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncSocialAccount } from "@/lib/sync/run";
import type { ActionState } from "@/lib/types";
import { setupGuard, toActionError } from "./_shared";

export async function syncAccountNowAction(accountId: string): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    await assertAdmin();
    const outcome = await syncSocialAccount(accountId, "manual");
    revalidatePath("/integrations");
    revalidatePath("/dashboard");
    revalidatePath("/content");
    if (outcome.status === "failed") return { error: outcome.error ?? "Sync failed." };
    return { message: `Synced ${outcome.itemsSynced} item(s).${outcome.warnings.length ? ` Notes: ${outcome.warnings.join(" · ")}` : ""}` };
  } catch (err) {
    return toActionError(err);
  }
}

/** Disconnects an account and deletes its stored credentials. Historical metrics are kept. */
export async function disconnectAccountAction(accountId: string): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    await assertAdmin();
    const admin = createAdminClient();
    await admin.from("social_account_tokens").delete().eq("social_account_id", accountId);
    const { error } = await admin.from("social_accounts").update({ status: "disconnected" }).eq("id", accountId);
    if (error) throw new Error(error.message);
    revalidatePath("/integrations");
    return { message: "Disconnected. Stored credentials were deleted; historical metrics are kept." };
  } catch (err) {
    return toActionError(err);
  }
}
