import { beforeEach, expect, test } from "vitest";
import { requireMember, requirePerm } from "@/src/access/guard";
import { memberships, projects, users } from "@/src/db/schema";
import { resetDb, testDb } from "../helpers";

const db = testDb();
beforeEach(() => resetDb(db));

test("non-member is forbidden; member gets role; super admin gets admin", async () => {
  const [sa, a, b] = await db.insert(users).values([
    { email: "s@x.com", name: "S", passwordHash: "x", isSuperAdmin: true },
    { email: "a@x.com", name: "A", passwordHash: "x" },
    { email: "b@x.com", name: "B", passwordHash: "x" },
  ]).returning();
  const [p] = await db.insert(projects).values({ name: "P" }).returning();
  await db.insert(memberships).values({ projectId: p.id, userId: a.id, role: "creator" });
  expect((await requireMember(db, a.id, p.id)).role).toBe("creator");
  await expect(requireMember(db, b.id, p.id)).rejects.toThrow("forbidden");
  expect((await requireMember(db, sa.id, p.id)).role).toBe("admin");
  await expect(requirePerm(db, a.id, p.id, "approve")).rejects.toThrow("forbidden");
});
