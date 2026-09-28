import { PlatformNotImplementedError } from "../types";

/** Official API client for instagram — Stage 3. No scraping, ever. */
export async function apiRequest(): Promise<never> {
  throw new PlatformNotImplementedError("instagram", "API client");
}
