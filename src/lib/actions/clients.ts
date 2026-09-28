"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/types";
import { setupGuard, str, toActionError } from "./_shared";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  company: z.string().max(200).optional(),
  email: z.union([z.literal(""), z.string().email("Invalid email")]).optional(),
  industry: z.string().max(200).optional(),
  notes: z.string().max(4000).optional(),
});

function readClient(fd: FormData) {
  return clientSchema.safeParse({
    name: str(fd, "name"),
    company: str(fd, "company"),
    email: str(fd, "email"),
    industry: str(fd, "industry"),
    notes: str(fd, "notes"),
  });
}

const nullify = (v?: string) => (v ? v : null);

export async function createClientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  let id: string;
  try {
    const viewer = await assertAdmin();
    const parsed = readClient(fd);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .insert({ ...parsed.data, company: nullify(parsed.data.company), email: nullify(parsed.data.email), industry: nullify(parsed.data.industry), notes: nullify(parsed.data.notes), created_by: viewer.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}

export async function updateClientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    await assertAdmin();
    const id = str(fd, "id");
    const parsed = readClient(fd);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const supabase = await createClient();
    const { error } = await supabase
      .from("clients")
      .update({ ...parsed.data, company: nullify(parsed.data.company), email: nullify(parsed.data.email), industry: nullify(parsed.data.industry), notes: nullify(parsed.data.notes) })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath(`/clients/${id}`);
    revalidatePath("/clients");
    return { message: "Client updated." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setClientStatusAction(id: string, status: "active" | "archived"): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("clients").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { message: status === "archived" ? "Client archived." : "Client restored." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteClientAction(id: string, confirmName: string): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { data: client } = await supabase.from("clients").select("name").eq("id", id).maybeSingle();
    if (!client) return { error: "Client not found." };
    if (client.name !== confirmName) return { error: "Type the client name exactly to confirm." };
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/clients");
  redirect("/clients");
}

/**
 * Invites a client user by email. The invitation row is written FIRST: the
 * database trigger that creates the user's profile reads it to assign the role
 * and workspace, so role never comes from user-controlled metadata.
 */
export async function inviteClientUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    const viewer = await assertAdmin();
    const clientId = str(fd, "clientId");
    const email = str(fd, "email").toLowerCase();
    const name = str(fd, "name");
    if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email address." };

    const admin = createAdminClient();
    const { data: existing } = await admin.from("users").select("id, role, client_id").ilike("email", email).maybeSingle();
    if (existing) {
      if (existing.role === "admin") return { error: "That email belongs to an agency admin." };
      if (existing.client_id && existing.client_id !== clientId) return { error: "That user already belongs to another client workspace." };
      await admin.from("users").update({ client_id: clientId }).eq("id", existing.id);
      revalidatePath(`/clients/${clientId}`);
      return { message: "Existing user added to this workspace." };
    }

    const { error: invErr } = await admin.from("invitations").insert({ email, client_id: clientId, role: "client", invited_by: viewer.id });
    if (invErr) throw new Error(invErr.message);
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name: name || undefined },
      redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password`,
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/clients/${clientId}`);
    return { message: `Invitation sent to ${email}.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function revokeInvitationAction(id: string, clientId: string): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("invitations").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath(`/clients/${clientId}`);
    return { message: "Invitation revoked." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function removeClientUserAction(userId: string, clientId: string): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("users").update({ client_id: null }).eq("id", userId).eq("role", "client");
    if (error) throw new Error(error.message);
    revalidatePath(`/clients/${clientId}`);
    return { message: "User removed from workspace." };
  } catch (err) {
    return toActionError(err);
  }
}

/** Invites another agency admin (full access to every client workspace). */
export async function inviteAdminAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = setupGuard();
  if (blocked) return blocked;
  try {
    const viewer = await assertAdmin();
    const email = str(fd, "email").toLowerCase();
    const name = str(fd, "name");
    if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email address." };
    const admin = createAdminClient();
    const { data: existing } = await admin.from("users").select("id").ilike("email", email).maybeSingle();
    if (existing) return { error: "That person already has an account." };
    const { error: invErr } = await admin.from("invitations").insert({ email, role: "admin", invited_by: viewer.id });
    if (invErr) throw new Error(invErr.message);
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name: name || undefined },
      redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password`,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
    return { message: `Admin invitation sent to ${email}.` };
  } catch (err) {
    return toActionError(err);
  }
}
