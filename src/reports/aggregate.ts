import { and, desc, eq, inArray } from "drizzle-orm";
import { requireMember, requirePerm } from "../access/guard";
import type { DB } from "../db/client";
import { contentChannels, contents, metrics, users, type Platform } from "../db/schema";
import { ForbiddenError, NotFoundError } from "../lib/errors";
import { bangkokDayKey, bangkokParts } from "../lib/time";

export const METRIC_KEYS = ["views", "likes", "comments", "shares", "clicks"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
export type MetricValues = Record<MetricKey, number | null>;

/** แถวรายงาน: 1 แถว = 1 ช่องทางที่โพสต์ขึ้นแล้วจริง (อัตโนมัติหรือโพสต์เอง) พร้อมตัวเลขล่าสุด (ถ้ามี) */
export type ReportRow = MetricValues & {
  contentChannelId: string; contentId: string; title: string; platform: Platform; publishedAt: Date;
  workTypeId: string | null; pillarId: string | null; format: string; ownerName: string;
  publishState: string; source: "api" | "manual" | null; day: string | null;
};

/** ยอดวิวรวมล่าสุดของแต่ละคอนเทนต์ (ใช้ตัวเลขวันล่าสุดของแต่ละช่องทาง) */
export async function viewsByContent(db: DB, contentIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!contentIds.length) return out;
  const rows = await db
    .selectDistinctOn([metrics.contentChannelId], { views: metrics.views, contentId: contentChannels.contentId })
    .from(metrics).innerJoin(contentChannels, eq(contentChannels.id, metrics.contentChannelId))
    .where(inArray(contentChannels.contentId, contentIds))
    .orderBy(metrics.contentChannelId, desc(metrics.day));
  for (const r of rows) out.set(r.contentId, (out.get(r.contentId) ?? 0) + (r.views ?? 0));
  return out;
}

export async function loadReportRows(db: DB, userId: string, projectId: string): Promise<ReportRow[]> {
  await requirePerm(db, userId, projectId, "reports");
  const ccs = await db.select({ cc: contentChannels, c: contents, ownerName: users.name }).from(contentChannels)
    .innerJoin(contents, eq(contents.id, contentChannels.contentId)).innerJoin(users, eq(users.id, contents.ownerId))
    .where(and(eq(contents.projectId, projectId), eq(contents.status, "published"), inArray(contentChannels.publishState, ["posted", "manual_done"])));
  if (!ccs.length) return [];
  const latest = await db.selectDistinctOn([metrics.contentChannelId]).from(metrics)
    .where(inArray(metrics.contentChannelId, ccs.map((x) => x.cc.id))).orderBy(metrics.contentChannelId, desc(metrics.day));
  return ccs.map(({ cc, c, ownerName }) => {
    const m = latest.find((x) => x.contentChannelId === cc.id);
    return {
      contentChannelId: cc.id, contentId: c.id, title: c.title, platform: cc.platform, publishedAt: c.scheduledAt, workTypeId: c.workTypeId, pillarId: c.pillarId,
      format: c.format, ownerName, publishState: cc.publishState, source: m?.source ?? null, day: m?.day ?? null,
      views: m?.views ?? null, likes: m?.likes ?? null, comments: m?.comments ?? null, shares: m?.shares ?? null, clicks: m?.clicks ?? null,
    };
  });
}

/** กรอกตัวเลขเอง (ช่องทางที่ไม่มี API) เก็บเป็นตัวเลขของวันนี้ตามเวลาไทย */
export async function enterMetrics(db: DB, actorId: string, contentChannelId: string, values: Partial<MetricValues>) {
  const [row] = await db.select({ cc: contentChannels, projectId: contents.projectId }).from(contentChannels).innerJoin(contents, eq(contents.id, contentChannels.contentId)).where(eq(contentChannels.id, contentChannelId));
  if (!row) throw new NotFoundError();
  await requirePerm(db, actorId, row.projectId, "metrics");
  const clean: MetricValues = { views: null, likes: null, comments: null, shares: null, clicks: null };
  for (const k of METRIC_KEYS) {
    const v = values[k];
    if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) continue;
    if (!Number.isInteger(v) || v < 0 || v > 2_000_000_000) throw new Error("validation");
    clean[k] = v;
  }
  const day = bangkokDayKey(new Date());
  await db.insert(metrics).values({ contentChannelId, day, ...clean, source: "manual", enteredBy: actorId })
    .onConflictDoUpdate({ target: [metrics.contentChannelId, metrics.day], set: { ...clean, source: "manual", enteredBy: actorId } });
}

export const engagement = (r: Pick<MetricValues, "likes" | "comments" | "shares">) => (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0);

export type Summary = { views: number; engagement: number; er: number; count: number; bySource: { api: number; manual: number; missing: number } };

export function summarize(rows: ReportRow[], range: { from: Date; to: Date }): Summary {
  const inRange = rows.filter((r) => r.publishedAt >= range.from && r.publishedAt < range.to);
  const views = inRange.reduce((s, r) => s + (r.views ?? 0), 0);
  const eng = inRange.reduce((s, r) => s + engagement(r), 0);
  return {
    views, engagement: eng, er: views ? eng / views : 0, count: new Set(inRange.map((r) => r.contentId)).size,
    bySource: {
      api: inRange.filter((r) => r.source === "api").length,
      manual: inRange.filter((r) => r.source === "manual").length,
      missing: inRange.filter((r) => !r.source).length,
    },
  };
}

export function groupBy(rows: ReportRow[], key: "platform" | "workTypeId" | "pillarId") {
  const m = new Map<string, { key: string; views: number; engagement: number; count: number; api: number; manual: number; missing: number }>();
  for (const r of rows) {
    const k = (r[key] as string | null) ?? "";
    const g = m.get(k) ?? { key: k, views: 0, engagement: 0, count: 0, api: 0, manual: 0, missing: 0 };
    g.views += r.views ?? 0; g.engagement += engagement(r); g.count++;
    if (r.source === "api") g.api++; else if (r.source === "manual") g.manual++; else g.missing++;
    m.set(k, g);
  }
  return [...m.values()].map((g) => ({ ...g, er: g.views ? g.engagement / g.views : 0 })).sort((a, b) => b.views - a.views);
}

/** ER เฉลี่ยตาม วันในสัปดาห์ (จ.=0 … อา.=6) × ชั่วโมงที่โพสต์ (เวลาไทย); ไม่มีข้อมูล = null */
export function bestTimes(rows: ReportRow[]): (number | null)[][] {
  const sum = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const n = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const r of rows) {
    if (!r.views) continue;
    const p = bangkokParts(r.publishedAt);
    const d = (p.weekday + 6) % 7;
    sum[d][p.hour] += engagement(r) / r.views;
    n[d][p.hour]++;
  }
  return sum.map((row, d) => row.map((s, h) => (n[d][h] ? s / n[d][h] : null)));
}

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV (UTF-8 พร้อม BOM เพื่อให้ Excel อ่านภาษาไทยได้) */
export function toCsv(rows: { [k: string]: unknown }[], columns: { key: string; label: string }[]): string {
  const lines = [columns.map((c) => esc(c.label)).join(","), ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export async function assertMember(db: DB, userId: string, projectId: string) {
  try { await requireMember(db, userId, projectId); } catch { throw new ForbiddenError(); }
}
