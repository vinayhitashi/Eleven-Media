import { PlatformNotImplementedError } from "../types";

/** OAuth for instagram — implemented in Stage 3 using the platform's official OAuth flow. */
export function getAuthorizationUrl(): string {
  throw new PlatformNotImplementedError("instagram", "OAuth");
}
