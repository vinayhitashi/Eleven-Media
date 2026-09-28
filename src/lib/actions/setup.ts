"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSetupState } from "@/lib/setup";
import type { ActionState } from "@/lib/types";
import { str, toActionError } from "./_shared";

/**
 * First-run only: creates the owner (first admin) account. Refuses as soon as any
 * admin exists, so it can't be used to escalate privileges later.
 */
export async function createOwnerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const state = await getSetupState();
    if (!state.configured) return { error: "Finish the configuration steps first." };
    if (!state.dbReady) return { error: "The database schema isn’t installed yet. Run the migration, then refresh." };
    if (state.hasAdmin) return { error: "An owner account already exists. Sign in instead." };

    const parsed = z
      .object({ name: z.string().min(1, "Enter your name").max(120), email: z.string().email("Enter a valid email"), password: z.string().min(10, "Use at least 10 characters") })
      .safeParse({ name: str(fd, "name"), email: str(fd, "email").toLowerCase(), password: String(fd.get("password") ?? "") });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    if (parsed.data.password !== String(fd.get("confirm") ?? "")) return { error: "Passwords do not match." };

    const admin = createAdminClient();
    // The profile trigger assigns roles ONLY from invitations — create one for the owner first.
    const { error: invErr } = await admin.from("invitations").insert({ email: parsed.data.email, role: "admin" });
    if (invErr) throw new Error(invErr.message);
    const { error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { name: parsed.data.name },
    });
    if (error) throw new Error(error.message);

    const supabase = await createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    if (signInErr) return { message: "Owner account created. Please sign in." };
  } catch (err) {
    return toActionError(err);
  }
  redirect("/dashboard?welcome=1");
}
