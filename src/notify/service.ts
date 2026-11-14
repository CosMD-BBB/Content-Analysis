import { and, count, desc, eq, inArray, isNull, lte, gte } from "drizzle-orm";
import type { DB } from "../db/client";
import { contentChannels, contents, memberships, notificationPrefs, notifications, projects, users } from "../db/schema";
import { emailConfigured, sendEmail } from "./email";

export type NotifyKind = "submitted" | "changes_requested" | "approved" | "published" | "publish_failed" | "manual_todo" | "due_soon" | "commented";

export const KIND_TEXT: Record<NotifyKind, string> = {
  submitted: "ส่งงานมาให้อนุมัติ",
  changes_requested: "ขอให้แก้งาน",
  approved: "อนุมัติงานของคุณแล้ว",
  published: "งานเผยแพร่แล้ว",
  publish_failed: "โพสต์อัตโนมัติไม่สำเร็จ",
  manual_todo: "มีช่องทางที่ต้องโพสต์เอง",
  due_soon: "งานใกล้ถึงกำหนดแต่ยังไม่ได้ส่ง",
  commented: "มีความคิดเห็นใหม่ในงาน",
};

async function managersOf(db: DB, projectId: string) {
  return (await db.select({ id: memberships.userId }).from(memberships).where(and(eq(memberships.projectId, projectId), inArray(memberships.role, ["admin", "manager"])))).map((r) => r.id);
}

/** ผู้รับแจ้งเตือนของแต่ละเหตุการณ์ (ไม่รวมคนที่ทำเอง และเฉพาะสมาชิกโปรเจกต์นั้น) */
export async function recipients(db: DB, kind: NotifyKind, contentId: string, actorId: string | null): Promise<string[]> {
  const [c] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!c) return [];
  let ids: string[] = [];
  if (kind === "submitted") ids = await managersOf(db, c.projectId);
  else if (kind === "publish_failed" || kind === "manual_todo") ids = [c.ownerId, ...(await managersOf(db, c.projectId))];
  else ids = [c.ownerId];
  const members = new Set((await db.select({ id: memberships.userId }).from(memberships).where(eq(memberships.projectId, c.projectId))).map((r) => r.id));
  return [...new Set(ids)].filter((id) => id !== actorId && members.has(id));
}

export async function notify(db: DB, kind: NotifyKind, contentId: string, actorId: string | null): Promise<number> {
  const ids = await recipients(db, kind, contentId, actorId);
  if (!ids.length) return 0;
  const [c] = await db.select({ title: contents.title, projectId: contents.projectId, project: projects.name }).from(contents).innerJoin(projects, eq(projects.id, contents.projectId)).where(eq(contents.id, contentId));
  const [actor] = actorId ? await db.select({ name: users.name }).from(users).where(eq(users.id, actorId)) : [];
  const prefs = await db.select().from(notificationPrefs).where(inArray(notificationPrefs.userId, ids));
  const people = await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, ids));
  const pref = (id: string) => prefs.find((p) => p.userId === id) ?? { inApp: true, email: true };
  const inApp = ids.filter((id) => pref(id).inApp);
  if (inApp.length) await db.insert(notifications).values(inApp.map((userId) => ({ userId, projectId: c.projectId, kind, contentId })));
  if (emailConfigured()) {
    const link = `${process.env.APP_URL ?? ""}/p/${c.projectId}/content/${contentId}`;
    for (const p of people.filter((x) => pref(x.id).email)) {
      await sendEmail(p.email, `[${c.project}] ${KIND_TEXT[kind]}: ${c.title}`,
        `<p>${actor ? `${actor.name} ` : ""}${KIND_TEXT[kind]}</p><p><b>${c.title}</b></p><p><a href="${link}">เปิดงานใน Content Studio</a></p>`).catch((e) => console.error("[email]", e));
    }
  }
  return ids.length;
}

export async function notifyPublished(db: DB, contentId: string, actorId?: string): Promise<void> {
  await notify(db, "published", contentId, actorId ?? null);
  const [{ n }] = await db.select({ n: count() }).from(contentChannels).where(and(eq(contentChannels.contentId, contentId), eq(contentChannels.publishState, "manual_todo")));
  if (n) await notify(db, "manual_todo", contentId, actorId ?? null);
}

/** เตือนงานที่ยังไม่ส่งอนุมัติแต่จะถึงกำหนดภายใน 2 วัน */
export async function notifyDueSoon(db: DB, now = new Date()): Promise<number> {
  const rows = await db.select({ id: contents.id }).from(contents)
    .where(and(inArray(contents.status, ["idea", "draft", "changes"]), gte(contents.scheduledAt, now), lte(contents.scheduledAt, new Date(now.getTime() + 2 * 864e5))));
  let n = 0;
  for (const r of rows) n += await notify(db, "due_soon", r.id, null);
  return n;
}

export async function listNotifications(db: DB, userId: string, limit = 15) {
  const rows = await db.select({ n: notifications, title: contents.title }).from(notifications).leftJoin(contents, eq(contents.id, notifications.contentId))
    .where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
  const [{ unread }] = await db.select({ unread: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { unread, items: rows.map((r) => ({ ...r.n, title: r.title, text: KIND_TEXT[r.n.kind as NotifyKind] ?? r.n.kind })) };
}

export async function markAllRead(db: DB, userId: string) {
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function getPrefs(db: DB, userId: string) {
  const [p] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId));
  return p ?? { userId, email: true, inApp: true };
}

export async function setPrefs(db: DB, userId: string, prefs: { email: boolean; inApp: boolean }) {
  await db.insert(notificationPrefs).values({ userId, ...prefs }).onConflictDoUpdate({ target: notificationPrefs.userId, set: prefs });
}
