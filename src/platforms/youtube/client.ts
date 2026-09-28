import { serverEnv } from "@/lib/env";

const DATA_API = "https://www.googleapis.com/youtube/v3";
const ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2";

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public reason?: string,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

type Auth = { accessToken: string } | { apiKey: string };

async function request<T>(base: string, path: string, params: Record<string, string | number | undefined>, auth: Auth): Promise<T> {
  const url = new URL(`${base}${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const headers: Record<string, string> = { Accept: "application/json" };
  if ("accessToken" in auth) headers.Authorization = `Bearer ${auth.accessToken}`;
  else url.searchParams.set("key", auth.apiKey);

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    let reason: string | undefined;
    let message = `YouTube API ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string; errors?: { reason?: string }[] } };
      message = body.error?.message ?? message;
      reason = body.error?.errors?.[0]?.reason;
    } catch {
      /* ignore */
    }
    throw new YouTubeApiError(message, res.status, reason);
  }
  return (await res.json()) as T;
}

export function dataApi<T>(path: string, params: Record<string, string | number | undefined>, auth: Auth) {
  return request<T>(DATA_API, path, params, auth);
}

export function analyticsApi<T>(params: Record<string, string | number | undefined>, accessToken: string) {
  return request<T>(ANALYTICS_API, "/reports", params, { accessToken });
}

/** Auth for public Data API calls: prefer an OAuth token, fall back to the server API key. */
export function publicAuth(accessToken?: string | null): Auth | null {
  if (accessToken) return { accessToken };
  const key = serverEnv().youtubeApiKey;
  return key ? { apiKey: key } : null;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
