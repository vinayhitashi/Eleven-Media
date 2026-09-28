import { PlatformNotImplementedError } from "../types";

/** Daily sync for connected tiktok accounts — Stage 3. */
export async function syncAccount(): Promise<never> {
  throw new PlatformNotImplementedError("tiktok", "sync");
}
