import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test } from "vitest";
import { createContent } from "@/src/content/service";
import { addMedia, authorizeFile, removeMedia } from "@/src/media/service";
import { localStorage } from "@/src/media/storage";
import { getProjectContext } from "@/src/projects/service";
import { mkProject, mkUser } from "../factories";
import { resetDb, testDb } from "../helpers";

const db = testDb();
const dir = path.join(os.tmpdir(), `cs-media-${Date.now()}`);
const storage = localStorage(dir);
beforeEach(() => resetDb(db));

async function setup() {
  const f = await mkProject(db);
  const ctx = await getProjectContext(db, f.owner.id, f.project.id);
  const c = await createContent(db, f.creator.id, f.project.id, {
    title: "t", workTypeId: null, format: "image", pillarId: null, date: "2030-01-01", time: "10:00", ownerId: f.creator.id, platforms: ["instagram"],
  });
  return { ...f, ctx, c };
}

test("jpeg upload stores original and a 480px-wide webp thumb", async () => {
  const s = await setup();
  const buf = await readFile("tests/fixtures/sample.jpg");
  const m = await addMedia(db, storage, s.creator.id, s.c.id, { body: buf, mime: "image/jpeg", size: buf.length });
  expect(m.width).toBe(1200);
  const thumb = await readFile(path.join(dir, m.thumbKey!));
  const meta = await sharp(thumb).metadata();
  expect(meta.format).toBe("webp");
  expect(meta.width).toBe(480);
  expect((await readFile(path.join(dir, m.storageKey))).length).toBe(buf.length);
});

test("heic body is rejected before storing", async () => {
  const s = await setup();
  const buf = await readFile("tests/fixtures/sample.heic");
  await expect(addMedia(db, storage, s.creator.id, s.c.id, { body: buf, mime: "image/heic", size: buf.length })).rejects.toThrow("รองรับเฉพาะรูป JPG, PNG, WebP");
});

test("creator cannot add media to someone else's content; outsiders cannot read files", async () => {
  const s = await setup();
  const buf = await readFile("tests/fixtures/sample.jpg");
  await expect(addMedia(db, storage, s.creator2.id, s.c.id, { body: buf, mime: "image/jpeg", size: buf.length })).rejects.toThrow("forbidden");
  const m = await addMedia(db, storage, s.creator.id, s.c.id, { body: buf, mime: "image/jpeg", size: buf.length });
  const outsider = await mkUser(db);
  await expect(authorizeFile(db, outsider.id, m.thumbKey!)).rejects.toThrow("forbidden");
  expect((await authorizeFile(db, s.analyst.id, m.thumbKey!))?.id).toBe(m.id);
  await removeMedia(db, storage, s.creator.id, m.id);
  expect(await authorizeFile(db, s.analyst.id, m.thumbKey!)).toBeNull();
});
