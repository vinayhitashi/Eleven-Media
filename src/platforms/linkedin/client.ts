import { PlatformNotImplementedError } from "../types";

/** Official API client for linkedin — Stage 3. No scraping, ever. */
export async function apiRequest(): Promise<never> {
  throw new PlatformNotImplementedError("linkedin", "API client");
}
