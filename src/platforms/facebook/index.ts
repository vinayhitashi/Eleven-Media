import { comingSoonAdapter } from "../stub";
import { parseFacebookUrl } from "./content-parser";

/**
 * Stage 3: Facebook Graph API (Pages) — page access tokens via Facebook Login.
 * Planned: /{post-id}/insights (post_impressions, reactions, comments, shares), /{page-id}/insights (page_fan_adds).
 */
export const facebookAdapter = comingSoonAdapter({
  id: "facebook",
  label: "Facebook",
  apis: ["Facebook Graph API (Pages)", "Facebook Login"],
  plannedSupport: { views: true, likes: true, comments: true, shares: true, followersAttributed: false, accountFollowersDaily: true },
  parseUrl: parseFacebookUrl,
});
