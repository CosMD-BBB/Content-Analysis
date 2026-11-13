import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { requireMember } from "../access/guard";
import { can, canEditContent } from "../access/permissions";
import type { DB } from "../db/client";
import {
  activity, comments, contentChannels, contents, contentVersions, favorites, media, memberships, pillars, users, workTypes,
  type Content, type ContentStatus, type Platform,
} from "../db/schema";
import { ForbiddenError, NotFoundError } from "../lib/errors";
import { bangkokTime, fromBangkokInput } from "../lib/time";
import { notify, type NotifyKind } from "../notify/service";
import { ACTION_LOG, nextStatus, type ContentAction } from "./state";
import { contentInput, type ContentInput } from "./validation";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Exec = DB | Tx;

export async function logActivity(db: Exec, projectId: string, userId: string | null, text: string, contentId?: string) {
  await db.insert(activity).values({ projectId, userId, text, contentId });
}

async function loadContent(db: Exec, contentId: string): Promise<Content> {
  const [c] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!c) throw new NotFoundError();
  return c;
}

/** โหลดงานพร้อมตรวจว่าผู้ใช้เป็นสมาชิกโปรเจกต์ของงานนั้น */
export async function contentAccess(db: DB, userId: string, contentId: string) {
  const c = await loadContent(db, contentId);
  const access = await requireMember(db, userId, c.projectId);
  return { content: c, ...access, isOwner: c.ownerId === userId };
}

async function checkRefs(db: Exec, projectId: string, input: { ownerId: string; workTypeId: string | null; pillarId: string | null }) {
  const [m] = await db.select().from(memberships).where(and(eq(memberships.projectId, projectId), eq(memberships.userId, input.ownerId)));
  const [u] = await db.select({ sa: users.isSuperAdmin }).from(users).where(eq(users.id, input.ownerId));
  if (!(m && m.role !== "analyst") && !u?.sa) throw new Error("validation");
  if (input.workTypeId) {
    const [w] = await db.select().from(workTypes).where(and(eq(workTypes.id, input.workTypeId), eq(workTypes.projectId, projectId)));
    if (!w) throw new Error("validation");
  }
  if (input.pillarId) {
    const [p] = await db.select().from(pillars).where(and(eq(pillars.id, input.pillarId), eq(pillars.projectId, projectId)));
    if (!p) throw new Error("validation");
  }
}

function parse(input: ContentInput) {
  const r = contentInput.safeParse(input);
  if (!r.success) throw new Error("validation");
  return r.data;
}

async function snapshot(db: Exec, contentId: string, userId: string) {
  const c = await loadContent(db, contentId);
  const ch = await db.select().from(contentChannels).where(eq(contentChannels.contentId, contentId));
  await db.insert(contentVersions).values({
    contentId, version: c.version, userId,
    snapshot: { title: c.title, workTypeId: c.workTypeId, format: c.format, pillarId: c.pillarId, scheduledAt: c.scheduledAt, ownerId: c.ownerId, caption: c.caption, assetLink: c.assetLink, status: c.status, channels: ch.map((x) => ({ platform: x.platform, captionOverride: x.captionOverride })) },
  });
}

async function syncChannels(db: Exec, contentId: string, platforms: Platform[], overrides: Partial<Record<Platform, string>>) {
  const existing = await db.select().from(contentChannels).where(eq(contentChannels.contentId, contentId));
  const drop = existing.filter((e) => !platforms.includes(e.platform)).map((e) => e.id);
  if (drop.length) await db.delete(contentChannels).where(inArray(contentChannels.id, drop));
  for (const p of platforms) {
    const ov = overrides[p]?.trim() ? overrides[p]! : null;
    const ex = existing.find((e) => e.platform === p);
    if (ex) await db.update(contentChannels).set({ captionOverride: ov }).where(eq(contentChannels.id, ex.id));
    else await db.insert(contentChannels).values({ contentId, platform: p, captionOverride: ov });
  }
}

export async function createContent(db: DB, actorId: string, projectId: string, raw: ContentInput, opts: { asIdea?: boolean } = {}): Promise<Content> {
  const { role } = await requireMember(db, actorId, projectId);
  if (!can(role, "create")) throw new ForbiddenError();
  const input = parse(raw);
  if (input.ownerId !== actorId && !can(role, "assign")) throw new ForbiddenError();
  return db.transaction(async (tx) => {
    await checkRefs(tx, projectId, input);
    const [c] = await tx.insert(contents).values({
      projectId, title: input.title, workTypeId: input.workTypeId, format: input.format, pillarId: input.pillarId,
      scheduledAt: fromBangkokInput(input.date, input.time), ownerId: input.ownerId, status: opts.asIdea ? "idea" : "draft",
      caption: input.caption, assetLink: input.assetLink,
    }).returning();
    await syncChannels(tx, c.id, input.platforms, input.captionOverrides);
    await snapshot(tx, c.id, actorId);
    await logActivity(tx, projectId, actorId, "สร้างคอนเทนต์ใหม่", c.id);
    return c;
  });
}

export async function updateContent(db: DB, actorId: string, contentId: string, raw: ContentInput, expectedVersion: number): Promise<{ ok: true; status: ContentStatus } | { ok: false; error: "stale" | "forbidden" }> {
  const { content, role, isOwner } = await contentAccess(db, actorId, contentId);
  if (!canEditContent(role, isOwner, content.status)) return { ok: false, error: "forbidden" };
  const input = parse(raw);
  if (input.ownerId !== content.ownerId && !can(role, "assign")) return { ok: false, error: "forbidden" };
  return db.transaction(async (tx) => {
    await checkRefs(tx, content.projectId, input);
    // งานที่อนุมัติแล้ว/ตั้งเวลาแล้ว ถ้าถูกแก้ ต้องกลับไปรออนุมัติใหม่
    const status: ContentStatus = content.status === "approved" || content.status === "scheduled" ? "review" : content.status;
    const updated = await tx.update(contents).set({
      title: input.title, workTypeId: input.workTypeId, format: input.format, pillarId: input.pillarId,
      scheduledAt: fromBangkokInput(input.date, input.time), ownerId: input.ownerId, caption: input.caption, assetLink: input.assetLink,
      status, version: sql`${contents.version} + 1`, updatedAt: new Date(),
    }).where(and(eq(contents.id, contentId), eq(contents.version, expectedVersion))).returning({ id: contents.id });
    if (!updated.length) return { ok: false as const, error: "stale" as const };
    await syncChannels(tx, contentId, input.platforms, input.captionOverrides);
    await snapshot(tx, contentId, actorId);
    await logActivity(tx, content.projectId, actorId, status !== content.status ? "แก้ไขงานที่อนุมัติแล้ว (ส่งกลับไปรออนุมัติ)" : "แก้ไขคอนเทนต์", contentId);
    return { ok: true as const, status };
  });
}

export type ActionOutcome = { ok: true; status: ContentStatus } | { ok: false; error: "invalid_action" | "comment_required" | "time_in_past" };

export async function applyAction(db: DB, actorId: string, contentId: string, action: Exclude<ContentAction, "publish">, opts: { comment?: string } = {}): Promise<ActionOutcome> {
  const { content, role, isOwner } = await contentAccess(db, actorId, contentId);
  const next = nextStatus(content.status, action, role, isOwner);
  if (!next) return { ok: false, error: "invalid_action" };
  if (action === "requestChanges" && !opts.comment?.trim()) return { ok: false, error: "comment_required" };
  if (action === "schedule" && content.scheduledAt.getTime() <= Date.now()) return { ok: false, error: "time_in_past" };
  await db.transaction(async (tx) => {
    await tx.update(contents).set({ status: next, updatedAt: new Date(), ...(action === "approve" ? { approvedBy: actorId } : {}) }).where(eq(contents.id, contentId));
    if (opts.comment?.trim()) await tx.insert(comments).values({ contentId, userId: actorId, body: opts.comment.trim() });
    await logActivity(tx, content.projectId, actorId, ACTION_LOG[action], contentId);
  });
  const kind: Partial<Record<ContentAction, NotifyKind>> = { submit: "submitted", requestChanges: "changes_requested", approve: "approved" };
  if (kind[action]) await notify(db, kind[action]!, contentId, actorId);
  return { ok: true, status: next };
}

/** ย้ายวันในปฏิทิน โดยคงเวลาเดิม */
export async function moveContent(db: DB, actorId: string, contentId: string, newDayKey: string): Promise<{ ok: true; status: ContentStatus } | { ok: false; error: "forbidden" }> {
  const { content, role, isOwner } = await contentAccess(db, actorId, contentId);
  if (!canEditContent(role, isOwner, content.status)) return { ok: false, error: "forbidden" };
  const at = fromBangkokInput(newDayKey, bangkokTime(content.scheduledAt));
  const status: ContentStatus = content.status === "approved" || content.status === "scheduled" ? "review" : content.status;
  await db.update(contents).set({ scheduledAt: at, status, version: sql`${contents.version} + 1`, updatedAt: new Date() }).where(eq(contents.id, contentId));
  await logActivity(db, content.projectId, actorId, "ย้ายวันลงงาน", contentId);
  return { ok: true, status };
}

export async function toggleFavorite(db: DB, userId: string, contentId: string): Promise<boolean> {
  await contentAccess(db, userId, contentId);
  const del = await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.contentId, contentId))).returning();
  if (del.length) return false;
  await db.insert(favorites).values({ userId, contentId });
  return true;
}

export type ContentFilters = { status?: ContentStatus; platform?: Platform; workTypeId?: string; ownerId?: string; q?: string; from?: Date; to?: Date; favoritesOf?: string };

/** รายการงานในโปรเจกต์ พร้อมช่องทาง รูปแรก และสถานะรายการโปรดของผู้ใช้ */
export async function listContents(db: DB, userId: string, projectId: string, f: ContentFilters = {}) {
  await requireMember(db, userId, projectId);
  const conds = [eq(contents.projectId, projectId)];
  if (f.status) conds.push(eq(contents.status, f.status));
  if (f.workTypeId) conds.push(eq(contents.workTypeId, f.workTypeId));
  if (f.ownerId) conds.push(eq(contents.ownerId, f.ownerId));
  if (f.from) conds.push(gte(contents.scheduledAt, f.from));
  if (f.to) conds.push(lt(contents.scheduledAt, f.to));
  if (f.q) conds.push(sql`(${contents.title} ilike ${"%" + f.q + "%"} or ${contents.caption} ilike ${"%" + f.q + "%"})`);
  if (f.platform) conds.push(sql`exists (select 1 from ${contentChannels} cc where cc.content_id = ${contents.id} and cc.platform = ${f.platform})`);
  if (f.favoritesOf) conds.push(sql`exists (select 1 from ${favorites} fv where fv.content_id = ${contents.id} and fv.user_id = ${f.favoritesOf})`);
  const rows = await db.select().from(contents).where(and(...conds)).orderBy(desc(contents.scheduledAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [chs, firstMedia, favs, owners] = await Promise.all([
    db.select().from(contentChannels).where(inArray(contentChannels.contentId, ids)),
    db.selectDistinctOn([media.contentId]).from(media).where(inArray(media.contentId, ids)).orderBy(media.contentId, asc(media.sortOrder), asc(media.createdAt)),
    db.select().from(favorites).where(and(eq(favorites.userId, userId), inArray(favorites.contentId, ids))),
    db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, [...new Set(rows.map((r) => r.ownerId))])),
  ]);
  return rows.map((c) => ({
    ...c,
    channels: chs.filter((x) => x.contentId === c.id),
    cover: firstMedia.find((m) => m.contentId === c.id) ?? null,
    favorite: favs.some((x) => x.contentId === c.id),
    ownerName: owners.find((o) => o.id === c.ownerId)?.name ?? "",
  }));
}
export type ContentRow = Awaited<ReturnType<typeof listContents>>[number];

export async function getContentDetail(db: DB, userId: string, contentId: string) {
  const acc = await contentAccess(db, userId, contentId);
  const id = contentId;
  const [chs, med, cmts, vers, fav] = await Promise.all([
    db.select().from(contentChannels).where(eq(contentChannels.contentId, id)),
    db.select().from(media).where(eq(media.contentId, id)).orderBy(asc(media.sortOrder), asc(media.createdAt)),
    db.select({ c: comments, name: users.name }).from(comments).innerJoin(users, eq(users.id, comments.userId)).where(eq(comments.contentId, id)).orderBy(asc(comments.createdAt)),
    db.select({ v: contentVersions, name: users.name }).from(contentVersions).innerJoin(users, eq(users.id, contentVersions.userId)).where(eq(contentVersions.contentId, id)).orderBy(desc(contentVersions.version)),
    db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.contentId, id))),
  ]);
  const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, acc.content.ownerId));
  return { ...acc, channels: chs, media: med, comments: cmts.map((x) => ({ ...x.c, userName: x.name })), versions: vers.map((x) => ({ ...x.v, userName: x.name })), favorite: fav.length > 0, ownerName: owner?.name ?? "" };
}
