import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, Viewer } from "@/lib/types";

/** The signed-in user with their app role. Cached for the duration of a request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("id, name, email, role, client_id, created_at").eq("id", user.id).maybeSingle<AppUser>();
  if (!data) return null;
  return data;
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(isConfigured() ? "/login" : "/setup");
  return viewer;
}

/** Admin-only pages: clients are sent back to their own dashboard. */
export async function requireAdminPage(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "admin") redirect("/dashboard");
  return viewer;
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** For server actions / route handlers. Throws instead of redirecting. */
export async function assertAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") throw new AuthorizationError();
  return viewer;
}

export async function assertClientAccess(clientId: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AuthorizationError("Please sign in.");
  if (viewer.role === "admin") return viewer;
  if (viewer.client_id && viewer.client_id === clientId) return viewer;
  throw new AuthorizationError();
}

/** Client IDs the viewer may see: null = all (admin). Clients without a workspace see nothing. */
export function scopeClientIds(viewer: Viewer, requested?: string | null): string[] | null {
  if (viewer.role === "admin") return requested ? [requested] : null;
  return viewer.client_id ? [viewer.client_id] : [];
}
