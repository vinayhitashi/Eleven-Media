import { isConfigured } from "@/lib/env";
import { AuthorizationError } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

export const SETUP_MESSAGE = "Eleven Growth isn’t configured yet — open /setup to finish configuration.";

/** Blocks writes until the server has its Supabase configuration. */
export function setupGuard(): ActionState | null {
  return isConfigured() ? null : { error: SETUP_MESSAGE };
}

export function toActionError(err: unknown): ActionState {
  if (err instanceof AuthorizationError) return { error: err.message };
  // Never leak internals; log server-side.
  console.error("[action]", err);
  const msg = err instanceof Error ? err.message : "Something went wrong.";
  return { error: msg.length > 200 ? "Something went wrong. Please try again." : msg };
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
