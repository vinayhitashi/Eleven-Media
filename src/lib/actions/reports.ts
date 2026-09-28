"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth";
import { monthRange, previousMonth, today } from "@/lib/dates";
import { getClient, loadEngineInput } from "@/lib/data";
import { buildReportData } from "@/lib/reports/build";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { setupGuard, str, toActionError } from "./_shared";

export async function generateReportAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  let id: string;
  try {
    const viewer = await assertAdmin();
    const clientId = str(fd, "clientId");
    const month = str(fd, "month");
    if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Choose a month." };
    if (`${month}-01` > today()) return { error: "That month hasn't started yet." };
    const client = await getClient(viewer, clientId);
    if (!client) return { error: "Client not found." };

    const range = monthRange(month);
    const prev = monthRange(previousMonth(month));
    const input = await loadEngineInput(viewer, { clientId, start: prev.start, end: range.end });
    const data = buildReportData({ input, client, month });

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("reports")
      .upsert(
        {
          client_id: clientId,
          month: `${month}-01`,
          status: "draft", // regenerating always returns to draft for review
          total_posts: data.overview.published,
          total_views: data.overview.views.value,
          followers_gained: data.overview.followersNet,
          data,
          pdf_url: null,
          generated_by: viewer.id,
          published_at: null,
        },
        { onConflict: "client_id,month" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = row.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/reports");
  redirect(`/reports/${id}`);
}

export async function setReportStatusAction(id: string, status: "draft" | "published"): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("reports")
      .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath(`/reports/${id}`);
    revalidatePath("/reports");
    return { message: status === "published" ? "Published — the client can now see this report." : "Moved back to draft." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteReportAction(id: string): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/reports");
  redirect("/reports");
}
