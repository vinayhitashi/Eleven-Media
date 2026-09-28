import { comingSoonAdapter } from "../stub";
import { parseTikTokUrl } from "./content-parser";

/**
 * Stage 3: TikTok API for Business / Display API (Login Kit OAuth).
 * Planned: video.list + video.query for view/like/comment/share counts, user.info.stats for followers.
 */
export const tiktokAdapter = comingSoonAdapter({
  id: "tiktok",
  label: "TikTok",
  apis: ["TikTok Display API", "TikTok Login Kit"],
  plannedSupport: { views: true, likes: true, comments: true, shares: true, followersAttributed: false, accountFollowersDaily: false },
  parseUrl: parseTikTokUrl,
});
