import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env, isConfigured } from "@/lib/env";
import { assertClientAccess, AuthorizationError } from "@/lib/auth";
import { getAdapter, isPlatform } from "@/platforms/registry";
import { OAUTH_COOKIE } from "@/lib/oauth";

/** Starts the platform OAuth flow for a client workspace. Admins, or the client's own users, may connect. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  const clientId = request.nextUrl.searchParams.get("clientId") ?? "";
  const returnTo = safeReturn(request.nextUrl.searchParams.get("returnTo"), clientId);
  const back = (q: string) => NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}${q}`, env.siteUrl));

  if (!isConfigured()) return back("error=not_configured");
  if (!isPlatform(platform)) return back("error=unknown_platform");
  const adapter = getAdapter(platform);
  if (!adapter.auth || adapter.status !== "available") return back(`error=${platform}_coming_soon`);
  if (!adapter.auth.isConfigured()) return back("error=oauth_not_configured");

  try {
    await assertClientAccess(clientId);
  } catch (err) {
    if (err instanceof AuthorizationError) return back("error=forbidden");
    throw err;
  }

  const state = randomBytes(24).toString("base64url");
  const redirectUri = `${env.siteUrl}/api/integrations/${platform}/callback`;
  const res = NextResponse.redirect(adapter.auth.getAuthorizationUrl(state, redirectUri));
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, clientId, platform, returnTo }), {
    httpOnly: true,
    secure: env.siteUrl.startsWith("https"),
    sameSite: "lax",
    path: "/api/integrations",
    maxAge: 600,
  });
  return res;
}

function safeReturn(value: string | null, clientId: string) {
  // Only allow same-site relative paths.
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return clientId ? `/clients/${clientId}?tab=platforms` : "/integrations";
}
