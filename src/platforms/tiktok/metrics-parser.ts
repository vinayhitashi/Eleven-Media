import type { ContentMetricsResult } from "../types";

/**
 * Maps tiktok API insight payloads to cumulative metrics — Stage 3.
 * Any metric the API does not return must stay null ("Not available").
 */
export function parseMetrics(contentId: string): ContentMetricsResult {
  return { contentId, views: null, likes: null, comments: null, shares: null, followersGained: null, source: "tiktok_not_connected" };
}
