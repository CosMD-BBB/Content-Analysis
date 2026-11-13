import { eq } from "drizzle-orm";
import { beforeEach, expect, test } from "vitest";
import { applyAction, createContent, getContentDetail, listContents, moveContent, toggleFavorite, updateContent } from "@/src/content/service";
import type { ContentInput } from "@/src/content/validation";
import { contents, contentVersions } from "@/src/db/schema";
import { getProjectContext } from "@/src/projects/service";
import { mkProject } from "../factories";
import { resetDb, testDb } from "../helpers";

const db = testDb();
beforeEach(() => resetDb(db));

const future = () => new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
async function setup() {
  const f = await mkProject(db);
  const ctx = await getProjectContext(db, f.owner.id, f.project.id);
  const input = (ownerId: string, over: Partial<ContentInput> = {}): ContentInput => ({
    title: "รีวิวเซรั่ม", workTypeId: ctx.workTypes[0].id, format: "reel", pillarId: ctx.pillars[0].id,
    date: future(), time: "19:00", ownerId, platforms: ["facebook", "instagram"], caption: "แคปชัน", captionOverrides: { x: "" }, assetLink: "", ...over,
  });
  return { ...f, ctx, input };
}

test("creator cannot create content owned by someone else", async () => {
  const s = await setup();
  await expect(createContent(db, s.creator.id, s.project.id, s.input(s.creator2.id))).rejects.toThrow("forbidden");
  const c = await createContent(db, s.manager.id, s.project.id, s.input(s.creator.id));
  expect(c.ownerId).toBe(s.creator.id);
});

test("analyst cannot create content", async () => {
  const s = await setup();
  await expect(createContent(db, s.analyst.id, s.project.id, s.input(s.analyst.id))).rejects.toThrow("forbidden");
});

test("editing a scheduled content sends it back to review", async () => {
  const s = await setup();
  const c = await createContent(db, s.creator.id, s.project.id, s.input(s.creator.id));
  await applyAction(db, s.creator.id, c.id, "submit");
  await applyAction(db, s.manager.id, c.id, "approve");
  expect(await applyAction(db, s.manager.id, c.id, "schedule")).toEqual({ ok: true, status: "scheduled" });
  const [cur] = await db.select().from(contents).where(eq(contents.id, c.id));
  const r = await updateContent(db, s.manager.id, c.id, s.input(s.creator.id, { title: "แก้ชื่อ" }), cur.version);
  expect(r).toEqual({ ok: true, status: "review" });
});

test("update with old version → stale, nothing written", async () => {
  const s = await setup();
  const c = await createContent(db, s.creator.id, s.project.id, s.input(s.creator.id));
  expect((await updateContent(db, s.creator.id, c.id, s.input(s.creator.id, { title: "A" }), 1)).ok).toBe(true);
  expect(await updateContent(db, s.manager.id, c.id, s.input(s.creator.id, { title: "B" }), 1)).toEqual({ ok: false, error: "stale" });
  const [cur] = await db.select().from(contents).where(eq(contents.id, c.id));
  expect(cur.title).toBe("A");
});

test("every update writes a version row", async () => {
  const s = await setup();
  const c = await createContent(db, s.creator.id, s.project.id, s.input(s.creator.id));
  await updateContent(db, s.creator.id, c.id, s.input(s.creator.id, { title: "v2" }), 1);
  const v = await db.select().from(contentVersions).where(eq(contentVersions.contentId, c.id));
  expect(v.map((x) => x.version).sort()).toEqual([1, 2]);
});

test("request changes needs a comment; schedule in the past is refused", async () => {
  const s = await setup();
  const c = await createContent(db, s.creator.id, s.project.id, s.input(s.creator.id, { date: "2020-01-01" }));
  await applyAction(db, s.creator.id, c.id, "submit");
  expect(await applyAction(db, s.manager.id, c.id, "requestChanges")).toEqual({ ok: false, error: "comment_required" });
  await applyAction(db, s.manager.id, c.id, "approve");
  expect(await applyAction(db, s.manager.id, c.id, "schedule")).toEqual({ ok: false, error: "time_in_past" });
});

test("creator of another project content is forbidden; creator2 cannot edit creator's draft", async () => {
  const s = await setup();
  const c = await createContent(db, s.creator.id, s.project.id, s.input(s.creator.id));
  expect((await updateContent(db, s.creator2.id, c.id, s.input(s.creator.id), 1)).ok).toBe(false);
});

test("move keeps the time and published content cannot move", async () => {
  const s = await setup();
  const c = await createContent(db, s.creator.id, s.project.id, s.input(s.creator.id, { date: "2030-05-01", time: "08:15" }));
  await moveContent(db, s.creator.id, c.id, "2030-05-03");
  const [cur] = await db.select().from(contents).where(eq(contents.id, c.id));
  expect(cur.scheduledAt.toISOString()).toBe("2030-05-03T01:15:00.000Z");
  await db.update(contents).set({ status: "published" }).where(eq(contents.id, c.id));
  expect(await moveContent(db, s.manager.id, c.id, "2030-05-04")).toEqual({ ok: false, error: "forbidden" });
});

test("favorites are per user and list filters work", async () => {
  const s = await setup();
  const a = await createContent(db, s.creator.id, s.project.id, s.input(s.creator.id, { title: "แมว", platforms: ["tiktok"] }));
  await createContent(db, s.creator.id, s.project.id, s.input(s.creator.id, { title: "หมา" }));
  expect(await toggleFavorite(db, s.creator.id, a.id)).toBe(true);
  expect((await listContents(db, s.creator.id, s.project.id, { favoritesOf: s.creator.id })).map((c) => c.title)).toEqual(["แมว"]);
  expect(await listContents(db, s.manager.id, s.project.id, { favoritesOf: s.manager.id })).toEqual([]);
  expect((await listContents(db, s.manager.id, s.project.id, { platform: "tiktok" })).map((c) => c.title)).toEqual(["แมว"]);
  expect((await listContents(db, s.manager.id, s.project.id, { q: "หม" })).map((c) => c.title)).toEqual(["หมา"]);
  const d = await getContentDetail(db, s.creator.id, a.id);
  expect(d.favorite).toBe(true);
  expect(d.channels.map((x) => x.platform)).toEqual(["tiktok"]);
});

test("date range filter", async () => {
  const s = await setup();
  await createContent(db, s.creator.id, s.project.id, s.input(s.creator.id, { title: "เก่า", date: "2030-01-01" }));
  await createContent(db, s.creator.id, s.project.id, s.input(s.creator.id, { title: "ใหม่", date: "2030-02-01" }));
  const rows = await listContents(db, s.manager.id, s.project.id, { from: new Date("2030-01-15T00:00:00Z"), to: new Date("2030-03-01T00:00:00Z") });
  expect(rows.map((r) => r.title)).toEqual(["ใหม่"]);
});
