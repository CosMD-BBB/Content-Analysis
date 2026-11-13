import type { DB } from "../src/db/client";
import { memberships, users, type Role } from "../src/db/schema";
import { createProject } from "../src/projects/service";

let n = 0;
export async function mkUser(db: DB, opts: { superAdmin?: boolean; name?: string } = {}) {
  n++;
  const [u] = await db.insert(users).values({ email: `u${n}-${Date.now()}@x.com`, name: opts.name ?? `User ${n}`, passwordHash: "x", isSuperAdmin: !!opts.superAdmin }).returning();
  return u;
}

/** โปรเจกต์พร้อมสมาชิกครบทุกบทบาท */
export async function mkProject(db: DB) {
  const owner = await mkUser(db, { superAdmin: true, name: "Owner" });
  const project = await createProject(db, owner.id, { name: "Brand A" });
  const add = async (role: Role, name: string) => {
    const u = await mkUser(db, { name });
    await db.insert(memberships).values({ projectId: project.id, userId: u.id, role });
    return u;
  };
  const manager = await add("manager", "Manager");
  const creator = await add("creator", "Creator");
  const creator2 = await add("creator", "Creator2");
  const analyst = await add("analyst", "Analyst");
  return { owner, project, manager, creator, creator2, analyst };
}
