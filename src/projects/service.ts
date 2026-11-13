import { and, asc, count, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { requireMember, requirePerm } from "../access/guard";
import type { DB } from "../db/client";
import {
  channels, contentChannels, contents, invites, memberships, pillars, PLATFORMS, projects, users, workTypes,
  type Project, type Role,
} from "../db/schema";
import { ForbiddenError } from "../lib/errors";
import { newToken } from "../lib/tokens";
import { DEFAULT_PILLARS, DEFAULT_WORK_TYPES, initialChannelStatus } from "./defaults";

const INVITE_DAYS = 7;

async function isSuperAdmin(db: DB, userId: string) {
  const [u] = await db.select({ s: users.isSuperAdmin }).from(users).where(eq(users.id, userId));
  return !!u?.s;
}

export async function createProject(db: DB, actorId: string, input: { name: string; color?: string }): Promise<Project> {
  if (!(await isSuperAdmin(db, actorId))) throw new ForbiddenError();
  const name = input.name.trim();
  if (!name) throw new Error("validation");
  return db.transaction(async (tx) => {
    const [p] = await tx.insert(projects).values({ name, color: input.color || "#3E4FE0" }).returning();
    await tx.insert(memberships).values({ projectId: p.id, userId: actorId, role: "admin" });
    await tx.insert(workTypes).values(DEFAULT_WORK_TYPES.map((w, i) => ({ projectId: p.id, name: w.name, manualOnly: w.manualOnly, sortOrder: i })));
    await tx.insert(pillars).values(DEFAULT_PILLARS.map((x, i) => ({ projectId: p.id, name: x.name, color: x.color, sortOrder: i })));
    await tx.insert(channels).values(PLATFORMS.map((pl) => ({ projectId: p.id, platform: pl, status: initialChannelStatus(pl) })));
    return p;
  });
}

export async function archiveProject(db: DB, actorId: string, projectId: string) {
  if (!(await isSuperAdmin(db, actorId))) throw new ForbiddenError();
  await db.update(projects).set({ archivedAt: new Date() }).where(eq(projects.id, projectId));
}

export async function renameProject(db: DB, actorId: string, projectId: string, input: { name: string; color: string }) {
  await requirePerm(db, actorId, projectId, "team");
  if (!input.name.trim()) throw new Error("validation");
  await db.update(projects).set({ name: input.name.trim(), color: input.color }).where(eq(projects.id, projectId));
}

export type MyProject = Project & { role: Role; pendingApprovals: number; manualTodo: number };

export async function listMyProjects(db: DB, userId: string): Promise<MyProject[]> {
  const sa = await isSuperAdmin(db, userId);
  const rows = sa
    ? (await db.select().from(projects).where(isNull(projects.archivedAt)).orderBy(asc(projects.name))).map((p) => ({ ...p, role: "admin" as Role }))
    : (await db.select({ p: projects, role: memberships.role }).from(memberships).innerJoin(projects, eq(projects.id, memberships.projectId))
        .where(and(eq(memberships.userId, userId), isNull(projects.archivedAt))).orderBy(asc(projects.name))).map((r) => ({ ...r.p, role: r.role }));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const pend = await db.select({ pid: contents.projectId, n: count() }).from(contents).where(and(inArray(contents.projectId, ids), eq(contents.status, "review"))).groupBy(contents.projectId);
  const man = await db.select({ pid: contents.projectId, n: count() }).from(contentChannels).innerJoin(contents, eq(contents.id, contentChannels.contentId))
    .where(and(inArray(contents.projectId, ids), eq(contentChannels.publishState, "manual_todo"))).groupBy(contents.projectId);
  return rows.map((r) => ({ ...r, pendingApprovals: pend.find((x) => x.pid === r.id)?.n ?? 0, manualTodo: man.find((x) => x.pid === r.id)?.n ?? 0 }));
}

export async function getProjectContext(db: DB, userId: string, projectId: string) {
  const access = await requireMember(db, userId, projectId);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  const [wt, pl, ch] = await Promise.all([
    db.select().from(workTypes).where(eq(workTypes.projectId, projectId)).orderBy(asc(workTypes.sortOrder)),
    db.select().from(pillars).where(eq(pillars.projectId, projectId)).orderBy(asc(pillars.sortOrder)),
    db.select().from(channels).where(eq(channels.projectId, projectId)),
  ]);
  return { project, ...access, workTypes: wt, pillars: pl, channels: ch };
}

export async function listMembers(db: DB, actorId: string, projectId: string) {
  await requireMember(db, actorId, projectId);
  return db.select({ userId: users.id, name: users.name, email: users.email, role: memberships.role })
    .from(memberships).innerJoin(users, eq(users.id, memberships.userId)).where(eq(memberships.projectId, projectId)).orderBy(asc(users.name));
}

export async function addMemberByEmail(db: DB, actorId: string, projectId: string, email: string, role: Role): Promise<{ ok: true } | { ok: false; error: "not_registered" | "already_member" }> {
  await requirePerm(db, actorId, projectId, "team");
  const [u] = await db.select().from(users).where(eq(sql`lower(${users.email})`, email.trim().toLowerCase()));
  if (!u) return { ok: false, error: "not_registered" };
  const [m] = await db.select().from(memberships).where(and(eq(memberships.projectId, projectId), eq(memberships.userId, u.id)));
  if (m) return { ok: false, error: "already_member" };
  await db.insert(memberships).values({ projectId, userId: u.id, role });
  return { ok: true };
}

export async function createInvite(db: DB, actorId: string, projectId: string, role: Role): Promise<string> {
  await requirePerm(db, actorId, projectId, "team");
  const token = newToken();
  await db.insert(invites).values({ token, projectId, role, createdBy: actorId, expiresAt: new Date(Date.now() + INVITE_DAYS * 864e5) });
  return token;
}

export async function getInvite(db: DB, token: string) {
  const [row] = await db.select({ inv: invites, projectName: projects.name }).from(invites).innerJoin(projects, eq(projects.id, invites.projectId))
    .where(and(eq(invites.token, token), isNull(invites.usedAt), gt(invites.expiresAt, new Date())));
  return row ?? null;
}

export async function acceptInvite(db: DB, userId: string, token: string): Promise<{ ok: true; projectId: string } | { ok: false; error: "invalid_token" }> {
  const row = await getInvite(db, token);
  if (!row) return { ok: false, error: "invalid_token" };
  await db.update(invites).set({ usedAt: new Date() }).where(eq(invites.token, token));
  await db.insert(memberships).values({ projectId: row.inv.projectId, userId, role: row.inv.role }).onConflictDoNothing();
  return { ok: true, projectId: row.inv.projectId };
}

async function adminCount(db: DB, projectId: string) {
  const [{ n }] = await db.select({ n: count() }).from(memberships).where(and(eq(memberships.projectId, projectId), eq(memberships.role, "admin")));
  return n;
}

export async function changeRole(db: DB, actorId: string, projectId: string, userId: string, role: Role): Promise<{ ok: true } | { ok: false; error: "last_admin" }> {
  await requirePerm(db, actorId, projectId, "team");
  const [m] = await db.select().from(memberships).where(and(eq(memberships.projectId, projectId), eq(memberships.userId, userId)));
  if (!m) throw new ForbiddenError();
  if (m.role === "admin" && role !== "admin" && (await adminCount(db, projectId)) <= 1) return { ok: false, error: "last_admin" };
  await db.update(memberships).set({ role }).where(and(eq(memberships.projectId, projectId), eq(memberships.userId, userId)));
  return { ok: true };
}

export async function removeMember(db: DB, actorId: string, projectId: string, userId: string): Promise<{ ok: true } | { ok: false; error: "last_admin" }> {
  await requirePerm(db, actorId, projectId, "team");
  const [m] = await db.select().from(memberships).where(and(eq(memberships.projectId, projectId), eq(memberships.userId, userId)));
  if (!m) return { ok: true };
  if (m.role === "admin" && (await adminCount(db, projectId)) <= 1) return { ok: false, error: "last_admin" };
  await db.delete(memberships).where(and(eq(memberships.projectId, projectId), eq(memberships.userId, userId)));
  return { ok: true };
}

type NamedItem = { id?: string; name: string };

/** แทนที่รายการประเภทงานทั้งชุด: แถวที่มี id แก้ชื่อ, ไม่มี id เพิ่มใหม่, ที่หายไปลบ (คอนเทนต์ที่ใช้อยู่จะว่างช่องนี้) */
export async function updateWorkTypes(db: DB, actorId: string, projectId: string, list: (NamedItem & { manualOnly: boolean })[]) {
  await requirePerm(db, actorId, projectId, "team");
  await replaceList(db, workTypes, projectId, list.filter((x) => x.name.trim()), (x, i) => ({ name: x.name.trim(), manualOnly: x.manualOnly, sortOrder: i }));
}

export async function updatePillars(db: DB, actorId: string, projectId: string, list: (NamedItem & { color: string })[]) {
  await requirePerm(db, actorId, projectId, "team");
  await replaceList(db, pillars, projectId, list.filter((x) => x.name.trim()), (x, i) => ({ name: x.name.trim(), color: x.color, sortOrder: i }));
}

async function replaceList<T extends NamedItem>(
  db: DB, table: typeof workTypes | typeof pillars, projectId: string, list: T[], values: (x: T, i: number) => Record<string, unknown>,
) {
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: table.id }).from(table).where(eq(table.projectId, projectId));
    const keep = new Set(list.filter((x) => x.id).map((x) => x.id));
    const drop = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
    if (drop.length) await tx.delete(table).where(inArray(table.id, drop));
    for (const [i, x] of list.entries()) {
      if (x.id) await tx.update(table).set(values(x, i)).where(and(eq(table.id, x.id), eq(table.projectId, projectId)));
      else await tx.insert(table).values({ projectId, ...values(x, i) } as never);
    }
  });
}
