import { eq } from "drizzle-orm";
import { beforeEach, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addComment } from "@/src/content/comments";
import { applyAction, createContent } from "@/src/content/service";
import { memberships, notifications } from "@/src/db/schema";
import { addMedia } from "@/src/media/service";
import { localStorage } from "@/src/media/storage";
import { notifyDueSoon, recipients, setPrefs } from "@/src/notify/service";
import { createProject } from "@/src/projects/service";
import { mkProject, mkUser } from "../factories";
import { resetDb, testDb } from "../helpers";

const db = testDb();
beforeEach(() => resetDb(db));
const notesOf = (userId: string) => db.select().from(notifications).where(eq(notifications.userId, userId));

async function setup(date = "2030-01-01") {
  const f = await mkProject(db);
  const c = await createContent(db, f.creator.id, f.project.id, { title: "t", workTypeId: null, format: "image", pillarId: null, date, time: "10:00", ownerId: f.creator.id, platforms: ["facebook"] });
  return { ...f, c };
}

test("submit notifies managers and admins, not the submitter", async () => {
  const s = await setup();
  await applyAction(db, s.creator.id, s.c.id, "submit");
  expect(await notesOf(s.manager.id)).toHaveLength(1);
  expect(await notesOf(s.owner.id)).toHaveLength(1);
  expect(await notesOf(s.creator.id)).toHaveLength(0);
  expect(await notesOf(s.analyst.id)).toHaveLength(0);
});

test("recipients never include members of other projects", async () => {
  const s = await setup();
  const other = await mkUser(db);
  const b = await createProject(db, s.owner.id, { name: "B" });
  await db.insert(memberships).values({ projectId: b.id, userId: other.id, role: "manager" });
  const r = await recipients(db, "submitted", s.c.id, s.creator.id);
  expect(r).not.toContain(other.id);
  expect(r.sort()).toEqual([s.manager.id, s.owner.id].sort());
});

test("in-app pref off → no in-app notification", async () => {
  const s = await setup();
  await setPrefs(db, s.manager.id, { email: true, inApp: false });
  await applyAction(db, s.creator.id, s.c.id, "submit");
  expect(await notesOf(s.manager.id)).toHaveLength(0);
});

test("request changes notifies the owner", async () => {
  const s = await setup();
  await applyAction(db, s.creator.id, s.c.id, "submit");
  await applyAction(db, s.manager.id, s.c.id, "requestChanges", { comment: "แก้ปก" });
  const n = await notesOf(s.creator.id);
  expect(n.map((x) => x.kind)).toContain("changes_requested");
});

test("due soon reminds the owner for unsent work within 2 days", async () => {
  const soon = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const s = await setup(soon);
  expect(await notifyDueSoon(db)).toBe(1);
  expect((await notesOf(s.creator.id))[0].kind).toBe("due_soon");
});

test("pin needs media, coordinates in 0–1, and media from the same content", async () => {
  const s = await setup();
  await expect(addComment(db, s.manager.id, s.c.id, { body: "x", pinX: 0.5, pinY: 0.5 })).rejects.toThrow("validation");
  const buf = await readFile("tests/fixtures/sample.jpg");
  const m = await addMedia(db, localStorage(path.join(os.tmpdir(), "cs-pin")), s.creator.id, s.c.id, { body: buf, mime: "image/jpeg", size: buf.length });
  await expect(addComment(db, s.manager.id, s.c.id, { body: "x", mediaId: m.id, pinX: 1.5, pinY: 0.5 })).rejects.toThrow("validation");
  const c = await addComment(db, s.manager.id, s.c.id, { body: "โลโก้เล็กไป", mediaId: m.id, pinX: 0.25, pinY: 0.75 });
  expect(c.pinX).toBeCloseTo(0.25);
  expect((await notesOf(s.creator.id)).map((x) => x.kind)).toContain("commented");
});
