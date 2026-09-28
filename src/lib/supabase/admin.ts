import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, serverEnv } from "@/lib/env";

/**
 * Service-role client. BYPASSES RLS — only for trusted server code paths:
 * OAuth token storage, background sync, invitations. Never import from client code
 * (the "server-only" import makes that a build error).
 */
export function createAdminClient() {
  const key = serverEnv().serviceRoleKey;
  if (!env.supabaseUrl || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
