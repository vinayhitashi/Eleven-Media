import { PlatformNotImplementedError } from "../types";

/** OAuth for linkedin — implemented in Stage 3 using the platform's official OAuth flow. */
export function getAuthorizationUrl(): string {
  throw new PlatformNotImplementedError("linkedin", "OAuth");
}
