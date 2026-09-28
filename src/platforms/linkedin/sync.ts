import { PlatformNotImplementedError } from "../types";

/** Daily sync for connected linkedin accounts — Stage 3. */
export async function syncAccount(): Promise<never> {
  throw new PlatformNotImplementedError("linkedin", "sync");
}
