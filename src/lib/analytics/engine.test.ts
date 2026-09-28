import { test } from "node:test";
import assert from "node:assert/strict";
import { computePeriod, compare, type EngineContent } from "./engine";
import type { AccountMetricDay, ContentMetricSnapshot } from "@/lib/types";

const content = (id: string, published_at: string | null, platform: "youtube" | "instagram" = "youtube"): EngineContent => ({
  id,
  client_id: "c1",
  platform,
  title: id,
  url: `https://youtu.be/${id}`,
  thumbnail_url: null,
  published_at,
  social_account_id: "a1",
  content_type: "video",
});

const snap = (content_id: string, recorded_on: string, views: number | null, extra: Partial<ContentMetricSnapshot> = {}): ContentMetricSnapshot => ({
  content_id,
  recorded_on,
  views,
  likes: null,
  comments: null,
  shares: null,
  followers_gained: null,
  ...extra,
});

test("period views = end snapshot − baseline before period (Day1 100k → Day7 150k)", () => {
  const r = computePeriod(
    {
      contents: [content("v1", "2026-01-01T00:00:00Z")],
      snapshots: [snap("v1", "2026-03-01", 100_000), snap("v1", "2026-03-04", 120_000), snap("v1", "2026-03-07", 150_000)],
      accountDays: [],
    },
    { start: "2026-03-02", end: "2026-03-07" },
  );
  assert.equal(r.totals.views.value, 50_000);
  assert.equal(r.totals.views.partial, false);
  // Daily series sums to the period delta
  const seriesSum = r.series.reduce((s, p) => s + (p.views ?? 0), 0);
  assert.equal(seriesSum, 50_000);
});

test("content published inside the period counts from zero", () => {
  const r = computePeriod(
    { contents: [content("v2", "2026-03-03T10:00:00Z")], snapshots: [snap("v2", "2026-03-04", 5_000), snap("v2", "2026-03-07", 9_000)], accountDays: [] },
    { start: "2026-03-01", end: "2026-03-07" },
  );
  assert.equal(r.totals.views.value, 9_000);
  assert.equal(r.contentPublished, 1);
  assert.equal(r.totals.views.partial, false);
});

test("old content without a baseline is a flagged lower bound, never overcounted", () => {
  const r = computePeriod(
    { contents: [content("v3", "2025-01-01T00:00:00Z")], snapshots: [snap("v3", "2026-03-05", 1_000_000), snap("v3", "2026-03-07", 1_004_000)], accountDays: [] },
    { start: "2026-03-01", end: "2026-03-07" },
  );
  assert.equal(r.totals.views.value, 4_000);
  assert.equal(r.totals.views.partial, true);
});

test("metrics the API never provided stay null (Not available)", () => {
  const r = computePeriod(
    { contents: [content("v4", "2026-03-02T00:00:00Z")], snapshots: [snap("v4", "2026-03-05", 100)], accountDays: [] },
    { start: "2026-03-01", end: "2026-03-07" },
  );
  assert.equal(r.totals.shares.value, null);
  assert.equal(r.totals.likes.value, null);
  assert.equal(r.totals.engagements.value, null);
  assert.equal(r.totals.engagementRate, null);
});

test("channel followers: totals are point-in-time, gains are flows, never assigned to videos", () => {
  const acc = (d: string, total: number | null, g: number | null, l: number | null): AccountMetricDay => ({
    social_account_id: "a1",
    client_id: "c1",
    platform: "youtube",
    recorded_on: d,
    followers_total: total,
    followers_gained: g,
    followers_lost: l,
    views: null,
  });
  const r = computePeriod(
    {
      contents: [content("v5", "2026-03-02T00:00:00Z")],
      snapshots: [snap("v5", "2026-03-03", 10, { followers_gained: 2 })],
      accountDays: [acc("2026-03-01", null, 10, 1), acc("2026-03-02", null, 20, 4), acc("2026-03-03", 5000, null, null)],
    },
    { start: "2026-03-01", end: "2026-03-07" },
  );
  assert.equal(r.audience.followersGained, 30);
  assert.equal(r.audience.followersLost, 5);
  assert.equal(r.audience.followersNet, 25);
  assert.equal(r.audience.followersTotal, 5000);
  // Only the platform-attributed value is on the video — not the channel total.
  assert.equal(r.content[0]!.followersAttributed, 2);
});

test("growth vs previous period", () => {
  const input = {
    contents: [content("v6", "2026-01-01T00:00:00Z")],
    snapshots: [snap("v6", "2026-02-21", 0), snap("v6", "2026-02-28", 1000), snap("v6", "2026-03-07", 2500)],
    accountDays: [],
  };
  const c = compare(input, { start: "2026-03-01", end: "2026-03-07" }, { start: "2026-02-22", end: "2026-02-28" });
  assert.equal(c.current.totals.views.value, 1500);
  assert.equal(c.previous.totals.views.value, 1000);
  assert.equal(c.growth.views, 0.5);
});
