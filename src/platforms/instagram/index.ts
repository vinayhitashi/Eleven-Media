import { comingSoonAdapter } from "../stub";
import { parseInstagramUrl } from "./content-parser";

/**
 * Stage 3: Instagram Graph API (Business/Creator accounts via Facebook Login).
 * Planned: auth.ts (Facebook Login for Business), client.ts (graph.facebook.com),
 * metrics-parser.ts (/{media-id}/insights: views, likes, comments, shares, follows), sync.ts.
 */
export const instagramAdapter = comingSoonAdapter({
  id: "instagram",
  label: "Instagram",
  apis: ["Instagram Graph API", "Facebook Login for Business"],
  plannedSupport: { views: true, likes: true, comments: true, shares: true, followersAttributed: true, accountFollowersDaily: true },
  parseUrl: parseInstagramUrl,
});
