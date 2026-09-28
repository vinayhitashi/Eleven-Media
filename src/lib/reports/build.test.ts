import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportData } from "./build";
import { addDays } from "@/lib/dates";
import type { AccountMetricDay, Content, ContentMetricSnapshot } from "@/lib/types";

/** Small deterministic fixture (test-only) shaped like real synced data. */
function fixture() {
  const contents: Content[] = [];
  const snapshots: ContentMetricSnapshot[] = [];
  const accountDays: AccountMetricDay[] = [];
  for (let i = 0; i < 8; i++) {
    const pub = addDays("2026-07-01", i * 8);
    contents.push({
      id: `v${i}`, client_id: "c1", social_account_id: "a1", platform: "youtube", platform_content_id: `vid${i}`,
      url: `https://www.youtube.com/watch?v=vid${i}`, title: `Video ${i}`, thumbnail_url: null, content_type: "video",
      published_at: `${pub}T10:00:00Z`, metrics_status: "ok", last_synced_at: null, created_at: `${pub}T10:00:00Z`,
    });
    for (let d = pub, t = 1; d <= "2026-09-10"; d = addDays(d, 1), t++) {
      const views = Math.round((i + 1) * 1000 * (1 - Math.exp(-t / 6)));
      snapshots.push({ content_id: `v${i}`, recorded_on: d, views, likes: Math.round(views * 0.04), comments: Math.round(views * 0.004), shares: null, followers_gained: Math.round(views * 0.002) });
    }
  }
  contents.push({
    id: "ig1", client_id: "c1", social_account_id: null, platform: "instagram", platform_content_id: null, url: "https://www.instagram.com/p/abc/",
    title: "Reel", thumbnail_url: null, content_type: "reel", published_at: "2026-08-12T10:00:00Z", metrics_status: "unavailable", last_synced_at: null, created_at: "2026-08-12T10:00:00Z",
  });
  for (let d = "2026-07-01"; d <= "2026-09-08"; d = addDays(d, 1)) {
    accountDays.push({ social_account_id: "a1", client_id: "c1", platform: "youtube", recorded_on: d, followers_total: null, followers_gained: 20, followers_lost: 3, views: null });
  }
  accountDays.push({ social_account_id: "a1", client_id: "c1", platform: "youtube", recorded_on: "2026-09-10", followers_total: 12000, followers_gained: null, followers_lost: null, views: null });
  return { contents, snapshots, accountDays };
}

test("monthly report is complete and internally consistent", () => {
  const r = buildReportData({ input: fixture(), client: { id: "c1", name: "Matt Lowe", company: "Lowe Estates", industry: "Dubai Real Estate" }, month: "2026-08", now: "2026-09-10" });

  assert.equal(r.month, "2026-08");
  assert.equal(r.period.end, "2026-08-31");
  assert.ok(r.topContent.length === 5);
  for (let i = 1; i < r.topContent.length; i++) assert.ok((r.topContent[i - 1]!.views ?? 0) >= (r.topContent[i]!.views ?? 0));
  const seriesViews = r.series.daily.reduce((s, p) => s + (p.views ?? 0), 0);
  assert.equal(seriesViews, r.overview.views.value);
  assert.equal(r.series.weeklyOutput.reduce((s, w) => s + w.count, 0), r.overview.published);
  assert.equal(r.delivery.total, r.overview.published);
  assert.equal(r.overview.followersNet, 31 * 17);
  // Shares were never provided → Not available, and a note says so
  assert.equal(r.overview.shares.value, null);
  assert.ok(r.notes.some((n) => n.startsWith("Shares")));
  // Unconnected platform never gets invented numbers
  assert.equal(r.platforms.find((p) => p.platform === "instagram")?.views.value, null);
  assert.ok(!JSON.stringify(r).includes("NaN"));
});
