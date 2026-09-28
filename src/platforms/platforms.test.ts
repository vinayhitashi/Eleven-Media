import { test } from "node:test";
import assert from "node:assert/strict";
import { detectContentUrl } from "./detect";

test("YouTube URL formats", () => {
  const id = "dQw4w9WgXcQ";
  for (const u of [
    `https://www.youtube.com/watch?v=${id}&t=10s`,
    `https://youtu.be/${id}?si=abc`,
    `youtube.com/shorts/${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube.com/embed/${id}`,
  ]) {
    const r = detectContentUrl(u);
    assert.equal(r?.platform, "youtube", u);
    assert.equal(r?.contentId, id, u);
  }
  assert.equal(detectContentUrl(`youtube.com/shorts/${id}`)?.contentType, "short");
  const ch = detectContentUrl("https://www.youtube.com/@elevenmedia");
  assert.equal(ch?.platform, "youtube");
  assert.equal(ch?.contentId, null);
});

test("Other platforms", () => {
  assert.deepEqual(
    [detectContentUrl("https://www.instagram.com/reel/C8abcDEF123/")?.platform, detectContentUrl("https://www.instagram.com/reel/C8abcDEF123/")?.contentId],
    ["instagram", "C8abcDEF123"],
  );
  assert.equal(detectContentUrl("https://www.tiktok.com/@matt/video/7312345678901234567")?.contentId, "7312345678901234567");
  assert.equal(detectContentUrl("https://www.facebook.com/page/videos/123456789")?.contentId, "123456789");
  assert.equal(detectContentUrl("https://www.facebook.com/watch/?v=987")?.contentId, "987");
  assert.equal(
    detectContentUrl("https://www.linkedin.com/posts/matt-lowe_dubai-activity-7201234567890123456-AbCd")?.contentId,
    "urn:li:activity:7201234567890123456",
  );
  assert.equal(detectContentUrl("https://example.com/video"), null);
  assert.equal(detectContentUrl("not a url at all"), null);
});

import { cumulativeHistory } from "./youtube/metrics-parser";

test("YouTube per-day analytics → exact cumulative history", () => {
  const report = {
    columnHeaders: [{ name: "day" }, { name: "views" }, { name: "likes" }, { name: "comments" }, { name: "shares" }, { name: "subscribersGained" }],
    rows: [
      ["2026-09-01", 100, 10, 1, 2, 1],
      ["2026-09-02", 50, 5, 0, 1, 0],
      ["2026-09-03", 25, 2, 1, 0, 2],
    ],
  };
  const lifetime = { views: 1175, likes: 117, comments: 12, shares: 13, subscribersGained: 23 };
  const h = cumulativeHistory("v1", report, lifetime);
  assert.deepEqual(h.map((p) => p.views), [1100, 1150, 1175]);
  assert.deepEqual(h.map((p) => p.likes), [110, 115, 117]);
  assert.equal(h[2]!.followersGained, 23);
  assert.equal(h[0]!.followersGained, 21);
  // Unavailable lifetime metric stays null
  const h2 = cumulativeHistory("v1", report, { ...lifetime, shares: null });
  assert.ok(h2.every((p) => p.shares === null));
});
