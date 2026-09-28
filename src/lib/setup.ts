import "server-only";
import { configStatus, isConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SetupState {
  configured: boolean;
  dbReady: boolean;
  hasAdmin: boolean;
  checks: ReturnType<typeof configStatus>;
  dbError?: string;
}

/** Where the installation is in its first-run journey. Uses the service role; never exposes secrets. */
export async function getSetupState(): Promise<SetupState> {
  const checks = configStatus();
  if (!isConfigured()) return { configured: false, dbReady: false, hasAdmin: false, checks };
  try {
    const admin = createAdminClient();
    const { count, error } = await admin.from("users").select("id", { count: "exact", head: true }).eq("role", "admin");
    if (error) return { configured: true, dbReady: false, hasAdmin: false, checks, dbError: error.message };
    return { configured: true, dbReady: true, hasAdmin: (count ?? 0) > 0, checks };
  } catch (err) {
    return { configured: true, dbReady: false, hasAdmin: false, checks, dbError: err instanceof Error ? err.message : String(err) };
  }
}
