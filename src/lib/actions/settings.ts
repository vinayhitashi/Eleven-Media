"use server";

import { revalidatePath } from "next/cache";
import { AuthorizationError, getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { setupGuard, str, toActionError } from "./_shared";

export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    const viewer = await getViewer();
    if (!viewer) throw new AuthorizationError("Please sign in.");
    const name = str(fd, "name").slice(0, 120);
    if (!name) return { error: "Name is required." };
    const supabase = await createClient();
    // Column-level grants only allow `name` to be updated from a user session.
    const { error } = await supabase.from("users").update({ name }).eq("id", viewer.id);
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return { message: "Profile saved." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    if (!(await getViewer())) throw new AuthorizationError("Please sign in.");
    const password = String(fd.get("password") ?? "");
    if (password.length < 10) return { error: "Use at least 10 characters." };
    if (password !== String(fd.get("confirm") ?? "")) return { error: "Passwords do not match." };
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    return { message: "Password updated." };
  } catch (err) {
    return toActionError(err);
  }
}
