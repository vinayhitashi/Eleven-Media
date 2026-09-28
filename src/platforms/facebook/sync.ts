import { PlatformNotImplementedError } from "../types";

/** Daily sync for connected facebook accounts — Stage 3. */
export async function syncAccount(): Promise<never> {
  throw new PlatformNotImplementedError("facebook", "sync");
}
