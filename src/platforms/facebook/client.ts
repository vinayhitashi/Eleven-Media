import { PlatformNotImplementedError } from "../types";

/** Official API client for facebook — Stage 3. No scraping, ever. */
export async function apiRequest(): Promise<never> {
  throw new PlatformNotImplementedError("facebook", "API client");
}
