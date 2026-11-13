import { expect, test } from "vitest";
import { bestTimes, groupBy, summarize, toCsv, type ReportRow } from "@/src/reports/aggregate";

const row = (o: Partial<ReportRow>): ReportRow => ({
  contentChannelId: "cc", contentId: "c1", title: "t", platform: "facebook", publishedAt: new Date("2026-11-13T12:00:00Z"), workTypeId: null, pillarId: null,
  format: "reel", ownerName: "A", publishState: "posted", source: "api", day: "2026-11-13", views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, ...o,
});
const range = { from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-12-01T00:00:00Z") };

test("summarize computes views, engagement and ER", () => {
  const s = summarize([row({ views: 1000, likes: 50, comments: 5, shares: 5 }), row({ contentId: "c2", platform: "lemon8", views: 1000, likes: 40, source: "manual" }), row({ contentId: "c2", platform: "x", views: null, likes: null, source: null })], range);
  expect(s.views).toBe(2000);
  expect(s.engagement).toBe(100);
  expect(s.er).toBeCloseTo(0.05);
  expect(s.count).toBe(2);
  expect(s.bySource).toEqual({ api: 1, manual: 1, missing: 1 });
});

test("zero views → ER 0, rows outside range ignored", () => {
  expect(summarize([row({ views: 0, likes: 3 })], range).er).toBe(0);
  expect(summarize([row({ publishedAt: new Date("2026-10-01T00:00:00Z"), views: 10 })], range).views).toBe(0);
});

test("groupBy platform sorts by views", () => {
  const g = groupBy([row({ platform: "tiktok", views: 10 }), row({ platform: "facebook", views: 30 }), row({ platform: "facebook", views: 5 })], "platform");
  expect(g.map((x) => [x.key, x.views])).toEqual([["facebook", 35], ["tiktok", 10]]);
});

test("bestTimes uses Bangkok weekday/hour (Fri 19:00 → [4][19])", () => {
  const t = bestTimes([row({ views: 100, likes: 10 })]);
  expect(t[4][19]).toBeCloseTo(0.1);
  expect(t[4][12]).toBeNull();
});

test("csv escapes and starts with BOM", () => {
  const csv = toCsv([{ title: 'ลด 30%, "ทั้งร้าน"', views: 5 }], [{ key: "title", label: "ชื่อ" }, { key: "views", label: "ยอดวิว" }]);
  expect(csv.startsWith("﻿ชื่อ,ยอดวิว\r\n")).toBe(true);
  expect(csv).toContain('"ลด 30%, ""ทั้งร้าน"""');
});
