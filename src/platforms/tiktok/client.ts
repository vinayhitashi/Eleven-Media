import { PlatformNotImplementedError } from "../types";

/** Official API client for tiktok — Stage 3. No scraping, ever. */
export async function apiRequest(): Promise<never> {
  throw new PlatformNotImplementedError("tiktok", "API client");
}
