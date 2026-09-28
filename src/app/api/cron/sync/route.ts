import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isConfigured, serverEnv } from "@/lib/env";
import { syncAll } from "@/lib/sync/run";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Daily snapshot job. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const secret = serverEnv().cronSecret;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || header.length !== expected.length || !timingSafeEqual(Buffer.from(header), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isConfigured()) return NextResponse.json({ skipped: "not configured" });

  const started = Date.now();
  const result = await syncAll("cron");
  return NextResponse.json({
    durationMs: Date.now() - started,
    accounts: result.outcomes.length,
    failed: result.outcomes.filter((o) => o.status === "failed").map((o) => ({ id: o.accountId, error: o.error })),
    publicContentSynced: result.publicSynced,
  });
}
