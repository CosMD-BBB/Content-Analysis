import { eq } from "drizzle-orm";
import { beforeEach, expect, test } from "vitest";
import { requireMember } from "@/src/access/guard";
import { invites, memberships } from "@/src/db/schema";
import { acceptInvite, addMemberByEmail, changeRole, createInvite, createProject, getProjectContext, listMyProjects, updateWorkTypes } from "@/src/projects/service";
import { mkProject, mkUser } from "../factories";
import { resetDb, testDb } from "../helpers";

const db = testDb();
beforeEach(() => resetDb(db));

test("non super admin cannot create project", async () => {
  const u = await mkUser(db);
  await expect(createProject(db, u.id, { name: "X" })).rejects.toThrow("forbidden");
});

test("new project has 8 work types, 5 pillars, 8 channels, creator is admin", async () => {
  const { owner, project } = await mkProject(db);
  const ctx = await getProjectContext(db, owner.id, project.id);
  expect(ctx.workTypes).toHaveLength(8);
  expect(ctx.workTypes.find((w) => w.name === "Ads")!.manualOnly).toBe(true);
  expect(ctx.pillars).toHaveLength(5);
  expect(ctx.channels).toHaveLength(8);
  expect(ctx.channels.find((c) => c.platform === "lemon8")!.status).toBe("not_connected");
  expect(ctx.channels.find((c) => c.platform === "facebook")!.status).toBe("coming_soon");
  const [m] = await db.select().from(memberships).where(eq(memberships.userId, owner.id));
  expect(m.role).toBe("admin");
});

test("user with no membership sees no projects", async () => {
  await mkProject(db);
  const lone = await mkUser(db);
  expect(await listMyProjects(db, lone.id)).toEqual([]);
});

test("member of A cannot access B", async () => {
  const a = await mkProject(db);
  const b = await createProject(db, a.owner.id, { name: "Brand B" });
  await expect(requireMember(db, a.creator.id, b.id)).rejects.toThrow("forbidden");
  expect((await listMyProjects(db, a.creator.id)).map((p) => p.name)).toEqual(["Brand A"]);
});

test("invite token works once and expires after 7 days", async () => {
  const { owner, project } = await mkProject(db);
  const u1 = await mkUser(db), u2 = await mkUser(db);
  const t = await createInvite(db, owner.id, project.id, "creator");
  expect(await acceptInvite(db, u1.id, t)).toEqual({ ok: true, projectId: project.id });
  expect((await requireMember(db, u1.id, project.id)).role).toBe("creator");
  expect((await acceptInvite(db, u2.id, t)).ok).toBe(false);
  const t2 = await createInvite(db, owner.id, project.id, "creator");
  await db.update(invites).set({ expiresAt: new Date(Date.now() - 1) }).where(eq(invites.token, t2));
  expect((await acceptInvite(db, u2.id, t2)).ok).toBe(false);
});

test("creator cannot invite", async () => {
  const { creator, project } = await mkProject(db);
  await expect(createInvite(db, creator.id, project.id, "admin")).rejects.toThrow("forbidden");
});

test("cannot demote the last admin", async () => {
  const { owner, project } = await mkProject(db);
  expect(await changeRole(db, owner.id, project.id, owner.id, "manager")).toEqual({ ok: false, error: "last_admin" });
});

test("add member by email: unregistered and duplicate", async () => {
  const { owner, project, creator } = await mkProject(db);
  expect(await addMemberByEmail(db, owner.id, project.id, "nobody@x.com", "creator")).toEqual({ ok: false, error: "not_registered" });
  expect(await addMemberByEmail(db, owner.id, project.id, creator.email.toUpperCase(), "creator")).toEqual({ ok: false, error: "already_member" });
});

test("updateWorkTypes renames, adds and removes", async () => {
  const { owner, project } = await mkProject(db);
  const ctx = await getProjectContext(db, owner.id, project.id);
  const keep = ctx.workTypes.slice(0, 2).map((w, i) => ({ id: w.id, name: i ? w.name : "Organic", manualOnly: w.manualOnly }));
  await updateWorkTypes(db, owner.id, project.id, [...keep, { name: "Podcast", manualOnly: false }]);
  const after = await getProjectContext(db, owner.id, project.id);
  expect(after.workTypes.map((w) => w.name)).toEqual(["Organic", "VDO", "Podcast"]);
});
