import { PlatformNotImplementedError } from "../types";

/** Daily sync for connected instagram accounts — Stage 3. */
export async function syncAccount(): Promise<never> {
  throw new PlatformNotImplementedError("instagram", "sync");
}
