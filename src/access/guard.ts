import { and, eq } from "drizzle-orm";
import type { DB } from "../db/client";
import { memberships, projects, users, type Role } from "../db/schema";
import { ForbiddenError } from "../lib/errors";
import { can, type Perm } from "./permissions";

export type Access = { role: Role; isSuperAdmin: boolean };

/** ต้องเป็นสมาชิกโปรเจกต์ (เจ้าของระบบได้สิทธิ์ admin ทุกโปรเจกต์) */
export async function requireMember(db: DB, userId: string, projectId: string): Promise<Access> {
  const [u] = await db.select({ isSuperAdmin: users.isSuperAdmin }).from(users).where(eq(users.id, userId));
  if (!u) throw new ForbiddenError();
  const [p] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
  if (!p) throw new ForbiddenError();
  if (u.isSuperAdmin) return { role: "admin", isSuperAdmin: true };
  const [m] = await db.select().from(memberships).where(and(eq(memberships.projectId, projectId), eq(memberships.userId, userId)));
  if (!m) throw new ForbiddenError();
  return { role: m.role, isSuperAdmin: false };
}

export async function requirePerm(db: DB, userId: string, projectId: string, perm: Perm): Promise<Role> {
  const { role } = await requireMember(db, userId, projectId);
  if (!can(role, perm)) throw new ForbiddenError();
  return role;
}
