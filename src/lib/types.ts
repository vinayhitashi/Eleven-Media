/**
 * Domain types shared by the data layer, analytics engine and UI.
 * Mirrors supabase/migrations/*_init.sql. Metric fields are `number | null`:
 * `null` ALWAYS means "the platform/API did not provide this value" and is rendered
 * as "Not available" — it is never coerced to 0 or estimated.
 */

export const PLATFORMS = ["youtube", "instagram", "tiktok", "facebook", "linkedin"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type UserRole = "admin" | "client";

export interface AppUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  client_id: string | null;
  created_at: string;
}

export type Viewer = AppUser;

export type ClientStatus = "active" | "archived";

export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  industry: string | null;
  notes: string | null;
  status: ClientStatus;
  created_at: string;
}

export type SocialAccountStatus = "connected" | "expired" | "error" | "disconnected";

export interface SocialAccount {
  id: string;
  client_id: string;
  platform: Platform;
  platform_account_id: string;
  account_name: string | null;
  account_handle: string | null;
  avatar_url: string | null;
  status: SocialAccountStatus;
  scopes: string[] | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
}

export type MetricsStatus = "pending" | "ok" | "unavailable" | "error";

export interface Content {
  id: string;
  client_id: string;
  social_account_id: string | null;
  platform: Platform;
  platform_content_id: string | null;
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  content_type: string | null;
  published_at: string | null;
  metrics_status: MetricsStatus;
  last_synced_at: string | null;
  created_at: string;
}

/** A daily snapshot of CUMULATIVE lifetime metrics for one piece of content. */
export interface ContentMetricSnapshot {
  content_id: string;
  recorded_on: string; // YYYY-MM-DD
  recorded_at?: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  /** Followers/subscribers the platform attributes to THIS content (cumulative). Never the channel total. */
  followers_gained: number | null;
}

/** A daily account-level (channel/profile) record. */
export interface AccountMetricDay {
  social_account_id: string;
  client_id: string;
  platform: Platform;
  recorded_on: string; // YYYY-MM-DD
  /** Total followers/subscribers on that day (point-in-time). */
  followers_total: number | null;
  /** Followers gained / lost DURING that day (flow). */
  followers_gained: number | null;
  followers_lost: number | null;
  views: number | null;
}

export type ReportStatus = "draft" | "published";

export interface ReportRow {
  id: string;
  client_id: string;
  month: string; // YYYY-MM-01
  status: ReportStatus;
  total_posts: number | null;
  total_views: number | null;
  followers_gained: number | null;
  pdf_url: string | null;
  data: unknown;
  created_at: string;
  updated_at: string;
}

export interface ContentWithLatest extends Content {
  client_name?: string;
  latest: ContentMetricSnapshot | null;
}

export interface ClientSummary extends Client {
  content_count: number;
  platforms: Platform[];
  last_synced_at: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  client_id: string | null;
  role: UserRole;
  accepted_at: string | null;
  created_at: string;
}

export type ActionState = { error?: string; message?: string; fieldErrors?: Record<string, string> } | null;
