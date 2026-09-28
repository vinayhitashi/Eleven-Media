"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { setupGuard, str } from "./_shared";

const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

export async function signIn(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) redirect("/setup");
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse({ email: str(fd, "email"), password: fd.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Incorrect email or password." };
  redirect(safeNext(str(fd, "next")));
}

export async function signOut() {
  const blocked = setupGuard();
  if (!blocked) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function requestPasswordReset(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  const email = str(fd, "email");
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password` });
  // Same response whether or not the account exists (no account enumeration).
  return { message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Your reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}
