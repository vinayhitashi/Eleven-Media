import type { Platform } from "@/lib/types";

/**
 * Platform adapter contract. Every social network lives in /platforms/<name> and
 * implements the parts of this interface it supports. The rest of the app only
 * talks to adapters through the registry — nothing outside /platforms knows
 * platform-specific API details.
 */

export interface ParsedContentUrl {
  platform: Platform;
  /** Platform-native id when it can be derived from the URL, else null. */
  contentId: string | null;
  /** Normalised canonical URL. */
  url: string;
  contentType?: string | null;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
}

export interface PlatformAccountInfo {
  platformAccountId: string;
  name: string | null;
  handle: string | null;
  avatarUrl: string | null;
  followersTotal: number | null;
}

export interface ContentDetails {
  contentId: string;
  title: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  accountId: string | null; // owning channel/profile id on the platform
  contentType: string | null;
}

/** Cumulative lifetime metrics for one content item at the time of fetch. null = not provided by the API. */
export interface ContentMetricsResult {
  contentId: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  followersGained: number | null;
  source: string;
}

export interface AccountDailyResult {
  date: string; // YYYY-MM-DD
  followersGained: number | null;
  followersLost: number | null;
  views: number | null;
}

export interface SyncContext {
  tokens: TokenSet;
  platformAccountId: string;
}

/** A reconstructed CUMULATIVE value for one content item at the end of a past day. */
export interface ContentHistoryPoint {
  contentId: string;
  date: string; // YYYY-MM-DD
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  followersGained: number | null;
}

export interface AccountSyncResult {
  account: PlatformAccountInfo;
  daily: AccountDailyResult[];
  contentDetails: ContentDetails[];
  contentMetrics: ContentMetricsResult[];
  /** Official per-day history for content that has none stored yet (optional per platform). */
  contentHistory?: ContentHistoryPoint[];
  warnings: string[];
}

export type AdapterStatus = "available" | "coming_soon";

export interface MetricSupport {
  views: boolean;
  likes: boolean;
  comments: boolean;
  shares: boolean;
  followersAttributed: boolean;
  accountFollowersDaily: boolean;
}

export interface PlatformAdapter {
  id: Platform;
  label: string;
  status: AdapterStatus;
  /** Official API(s) used — shown in the integrations UI. */
  apis: string[];
  metricSupport: MetricSupport;

  /** Returns a parsed result if this adapter recognises the URL, else null. Pure; no network. */
  parseUrl(url: string): ParsedContentUrl | null;

  auth?: {
    isConfigured(): boolean;
    getAuthorizationUrl(state: string, redirectUri: string): string;
    exchangeCode(code: string, redirectUri: string): Promise<TokenSet>;
    refresh(refreshToken: string): Promise<TokenSet>;
    getAccount(tokens: TokenSet): Promise<PlatformAccountInfo>;
  };

  /** Look up public details for content ids (title, thumbnail, date, owner). */
  fetchContentDetails?(contentIds: string[], tokens: TokenSet | null): Promise<ContentDetails[]>;

  /** Public (non-OAuth) metrics — only what the platform exposes publicly. */
  fetchPublicMetrics?(contentIds: string[]): Promise<ContentMetricsResult[]>;

  /** Full authorised sync for a connected account. */
  syncAccount?(ctx: SyncContext, opts: { contentIds: string[]; backfillDays: number; historyContentIds?: string[] }): Promise<AccountSyncResult>;

  /** Recent uploads for the "import from channel" flow. */
  listRecentContent?(ctx: SyncContext, limit: number): Promise<ContentDetails[]>;
}

export class PlatformNotImplementedError extends Error {
  constructor(platform: Platform, feature: string) {
    super(`${platform} ${feature} is not implemented yet (planned for Stage 3).`);
    this.name = "PlatformNotImplementedError";
  }
}
