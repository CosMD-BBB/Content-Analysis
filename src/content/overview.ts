import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { can } from "../access/permissions";
import { CATALOG } from "../channels/catalog";
import type { DB } from "../db/client";
import { activity, contentChannels, contents, metrics, users, type Role } from "../db/schema";
import { addDaysKey, bangkokDayKey, fromBangkokInput } from "../lib/time";
import { listContents, type ContentRow } from "./service";

export type Task = { tone: "warn" | "accent" | "bad" | "info"; icon: string; text: string; sub: string; content: ContentRow; anchor?: string };

export async function overview(db: DB, userId: string, projectId: string, role: Role) {
  const now = new Date();
  const today = bangkokDayKey(now);
  const all = await listContents(db, userId, projectId, { from: new Date(now.getTime() - 60 * 864e5) });
  const tasks: Task[] = [];
  const push = (t: Task) => tasks.push(t);
  const soon = (c: ContentRow) => c.scheduledAt.getTime() - now.getTime() < 7 * 864e5;
  for (const c of all) {
    if (c.status === "review" && can(role, "approve")) push({ tone: "warn", icon: "approve", text: `อนุมัติ: ${c.title}`, sub: `ส่งโดย ${c.ownerName}`, content: c });
    if (c.status === "approved" && can(role, "publish")) push({ tone: "accent", icon: "send", text: `ตั้งเวลา/เผยแพร่: ${c.title}`, sub: "อนุมัติแล้ว รอกดเผยแพร่", content: c });
    if (c.status === "changes" && (c.ownerId === userId || can(role, "editAny"))) push({ tone: "bad", icon: "pen", text: `แก้ตามคอมเมนต์: ${c.title}`, sub: "หัวหน้าขอให้แก้", content: c, anchor: "#comments" });
    if (c.status === "published" && can(role, "manual") && (c.ownerId === userId || can(role, "editAny")))
      for (const ch of c.channels.filter((x) => x.publishState === "manual_todo"))
        push({ tone: "bad", icon: "hand", text: `โพสต์เองที่ ${CATALOG[ch.platform].name}: ${c.title}`, sub: ch.reason ?? "", content: c, anchor: "#channels" });
    if (role === "creator" && c.ownerId === userId && (c.status === "idea" || c.status === "draft") && soon(c))
      push({ tone: "info", icon: "clock", text: `ทำให้เสร็จก่อนกำหนด: ${c.title}`, sub: "", content: c });
  }
  const weekStart = fromBangkokInput(today, "00:00");
  const week = all.filter((c) => c.scheduledAt >= weekStart && c.scheduledAt < fromBangkokInput(addDaysKey(today, 7), "00:00")).sort((a, b) => +a.scheduledAt - +b.scheduledAt);
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(today, i));

  const pub = all.filter((c) => c.status === "published");
  const ids = pub.map((c) => c.id);
  const views = new Map<string, number>();
  if (ids.length) {
    const rows = await db.selectDistinctOn([metrics.contentChannelId], { contentId: contentChannels.contentId, views: metrics.views, likes: metrics.likes, comments: metrics.comments, shares: metrics.shares })
      .from(metrics).innerJoin(contentChannels, eq(contentChannels.id, metrics.contentChannelId)).where(inArray(contentChannels.contentId, ids)).orderBy(metrics.contentChannelId, desc(metrics.day));
    for (const r of rows) views.set(r.contentId, (views.get(r.contentId) ?? 0) + (r.views ?? 0));
  }
  const sum = (from: number, to: number) => pub.filter((c) => { const age = (now.getTime() - c.scheduledAt.getTime()) / 864e5; return age >= from && age < to; }).reduce((s, c) => s + (views.get(c.id) ?? 0), 0);
  const top = pub.filter((c) => now.getTime() - c.scheduledAt.getTime() < 30 * 864e5).sort((a, b) => (views.get(b.id) ?? 0) - (views.get(a.id) ?? 0)).slice(0, 5);

  const log = await db.select({ a: activity, name: users.name, title: contents.title }).from(activity)
    .leftJoin(users, eq(users.id, activity.userId)).leftJoin(contents, eq(contents.id, activity.contentId))
    .where(and(eq(activity.projectId, projectId), gte(activity.createdAt, new Date(now.getTime() - 30 * 864e5)), lt(activity.createdAt, new Date(now.getTime() + 864e5))))
    .orderBy(desc(activity.createdAt)).limit(8);

  return {
    tasks,
    counts: {
      review: all.filter((c) => c.status === "review").length,
      ready: all.filter((c) => c.status === "approved" || c.status === "scheduled").length,
      scheduled: all.filter((c) => c.status === "scheduled").length,
      manual: pub.reduce((n, c) => n + c.channels.filter((x) => x.publishState === "manual_todo").length, 0),
    },
    views30: sum(0, 30), viewsPrev30: sum(30, 60),
    days, week, top: top.map((c) => ({ ...c, views: views.get(c.id) ?? 0 })),
    log: log.map((l) => ({ ...l.a, userName: l.name ?? "ระบบ", title: l.title })),
  };
}
