import { beforeEach, expect, test } from "vitest";
import { memberships, projects, users } from "@/src/db/schema";
import { resetDb, testDb } from "../helpers";

const db = testDb();
beforeEach(() => resetDb(db));

test("duplicate membership is rejected", async () => {
  const [u] = await db.insert(users).values({ email: "a@x.com", name: "A", passwordHash: "x" }).returning();
  const [p] = await db.insert(projects).values({ name: "P" }).returning();
  await db.insert(memberships).values({ projectId: p.id, userId: u.id, role: "admin" });
  await expect(db.insert(memberships).values({ projectId: p.id, userId: u.id, role: "creator" })).rejects.toThrow();
});

test("email uniqueness ignores case", async () => {
  await db.insert(users).values({ email: "A@x.com", name: "A", passwordHash: "x" });
  await expect(db.insert(users).values({ email: "a@x.com", name: "B", passwordHash: "x" })).rejects.toThrow();
});
