import type { PlatformAdapter } from "../types";
import * as auth from "./auth";
import { parseYouTubeUrl } from "./content-parser";
import { fetchContentDetails, fetchPublicMetrics, listRecentContent, syncAccount } from "./sync";

export const youtubeAdapter: PlatformAdapter = {
  id: "youtube",
  label: "YouTube",
  status: "available",
  apis: ["YouTube Data API v3", "YouTube Analytics API v2", "Google OAuth 2.0"],
  metricSupport: {
    views: true,
    likes: true, // null when the owner hides likes
    comments: true, // null when comments are disabled
    shares: true, // Analytics API only (connected channel)
    followersAttributed: true, // subscribersGained per video — Analytics API only
    accountFollowersDaily: true,
  },
  parseUrl: parseYouTubeUrl,
  auth: {
    isConfigured: auth.isConfigured,
    getAuthorizationUrl: auth.getAuthorizationUrl,
    exchangeCode: auth.exchangeCode,
    refresh: auth.refresh,
    getAccount: auth.getAccount,
  },
  fetchContentDetails,
  fetchPublicMetrics,
  syncAccount,
  listRecentContent,
};
