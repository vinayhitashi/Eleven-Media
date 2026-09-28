import { serverEnv } from "@/lib/env";
import type { PlatformAccountInfo, TokenSet } from "../types";
import { dataApi } from "./client";
import { toCount } from "./metrics-parser";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Read-only scopes: channel/video data + YouTube Analytics. Nothing that can modify a channel. */
export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

export function isConfigured() {
  const e = serverEnv();
  return Boolean(e.googleClientId && e.googleClientSecret);
}

export function getAuthorizationUrl(state: string, redirectUri: string) {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", serverEnv().googleClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline"); // we need a refresh token for daily sync
  url.searchParams.set("prompt", "consent select_account"); // guarantees a refresh token + lets brand accounts be picked
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const json = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || json.error) {
    throw new Error(`Google token error: ${json.error_description ?? json.error ?? res.status}`);
  }
  return json;
}

function toTokenSet(json: GoogleTokenResponse, fallbackRefresh: string | null): TokenSet {
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? fallbackRefresh,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    scopes: json.scope ? json.scope.split(" ") : [],
  };
}

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
  const e = serverEnv();
  const json = await tokenRequest({
    code,
    client_id: e.googleClientId,
    client_secret: e.googleClientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  return toTokenSet(json, null);
}

export async function refresh(refreshToken: string): Promise<TokenSet> {
  const e = serverEnv();
  const json = await tokenRequest({
    refresh_token: refreshToken,
    client_id: e.googleClientId,
    client_secret: e.googleClientSecret,
    grant_type: "refresh_token",
  });
  // Google does not return a new refresh token on refresh — keep the existing one.
  return toTokenSet(json, refreshToken);
}

interface ChannelsResponse {
  items?: {
    id: string;
    snippet?: { title?: string; customUrl?: string; thumbnails?: Record<string, { url: string } | undefined> };
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }[];
}

export async function getChannel(accessToken: string) {
  const res = await dataApi<ChannelsResponse>(
    "/channels",
    { part: "snippet,statistics,contentDetails", mine: "true" },
    { accessToken },
  );
  const ch = res.items?.[0];
  if (!ch) throw new Error("No YouTube channel found for this Google account. Choose the account/brand account that owns the channel.");
  return ch;
}

export async function getAccount(tokens: TokenSet): Promise<PlatformAccountInfo> {
  const ch = await getChannel(tokens.accessToken);
  return {
    platformAccountId: ch.id,
    name: ch.snippet?.title ?? null,
    handle: ch.snippet?.customUrl ?? null,
    avatarUrl: ch.snippet?.thumbnails?.default?.url ?? ch.snippet?.thumbnails?.medium?.url ?? null,
    // Hidden subscriber counts stay null — never guessed.
    followersTotal: ch.statistics?.hiddenSubscriberCount ? null : toCount(ch.statistics?.subscriberCount),
  };
}
