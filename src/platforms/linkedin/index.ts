import { comingSoonAdapter } from "../stub";
import { parseLinkedInUrl } from "./content-parser";

/**
 * Stage 3: LinkedIn Community Management API (organization pages) via 3-legged OAuth.
 * Planned: organizationalEntityShareStatistics (impressions, likes, comments, shares), follower statistics.
 */
export const linkedinAdapter = comingSoonAdapter({
  id: "linkedin",
  label: "LinkedIn",
  apis: ["LinkedIn Community Management API", "LinkedIn OAuth 2.0"],
  plannedSupport: { views: true, likes: true, comments: true, shares: true, followersAttributed: false, accountFollowersDaily: true },
  parseUrl: parseLinkedInUrl,
});
