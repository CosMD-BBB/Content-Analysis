import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import sharp from "sharp";
import { canEditContent } from "../access/permissions";
import { contentAccess, logActivity } from "../content/service";
import type { DB } from "../db/client";
import { media, type Media } from "../db/schema";
import { ForbiddenError, NotFoundError } from "../lib/errors";
import type { Body, Storage } from "./storage";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
export const MAX_IMAGE = 20 * 1024 * 1024;
export const MAX_VIDEO = 500 * 1024 * 1024;
const THUMB_WIDTH = 480;

export const UPLOAD_MSG = {
  type: "รองรับเฉพาะรูป JPG, PNG, WebP และวิดีโอ MP4, MOV",
  image: "รูปต้องไม่เกิน 20 MB",
  video: "วิดีโอต้องไม่เกิน 500 MB",
};

export function checkUpload(mime: string, size: number): { ok: true; kind: "image" | "video" } | { ok: false; message: string } {
  const m = mime.toLowerCase();
  if (IMAGE_TYPES.includes(m)) return size > MAX_IMAGE ? { ok: false, message: UPLOAD_MSG.image } : { ok: true, kind: "image" };
  if (VIDEO_TYPES.includes(m)) return size > MAX_VIDEO ? { ok: false, message: UPLOAD_MSG.video } : { ok: true, kind: "video" };
  return { ok: false, message: UPLOAD_MSG.type };
}

const ext = (mime: string) => ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov" })[mime] ?? "bin";

async function requireEditable(db: DB, actorId: string, contentId: string) {
  const a = await contentAccess(db, actorId, contentId);
  if (!canEditContent(a.role, a.isOwner, a.content.status)) throw new ForbiddenError();
  return a;
}

async function makeThumb(storage: Storage, key: string, input: Buffer) {
  const img = sharp(input).rotate();
  const meta = await img.metadata();
  const thumb = await img.resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  await storage.put(key, thumb, "image/webp", thumb.length);
  return { width: meta.autoOrient?.width ?? meta.width ?? null, height: meta.autoOrient?.height ?? meta.height ?? null };
}

/** เพิ่มไฟล์ให้คอนเทนต์ (รูป: ทำรูปย่อให้, วิดีโอ: ใช้ cover ที่หน้าเว็บจับเฟรมแรกส่งมา ถ้ามี) */
export async function addMedia(
  db: DB, storage: Storage, actorId: string, contentId: string,
  file: { body: Body; mime: string; size: number }, cover?: Buffer,
): Promise<Media> {
  const chk = checkUpload(file.mime, file.size);
  if (!chk.ok) throw new Error(chk.message);
  const { content } = await requireEditable(db, actorId, contentId);
  const base = `p/${content.projectId}/c/${contentId}/${randomUUID()}`;
  const key = `${base}.${ext(file.mime)}`;
  let dims: { width: number | null; height: number | null } = { width: null, height: null };
  let thumbKey: string | null = null;
  if (chk.kind === "image") {
    const buf = Buffer.isBuffer(file.body) ? file.body : await streamToBuffer(file.body, MAX_IMAGE);
    try {
      dims = await makeThumb(storage, `${base}.thumb.webp`, buf);
    } catch {
      throw new Error("ไฟล์รูปเสีย หรือไม่ใช่รูปจริง ลองบันทึกใหม่เป็น JPG แล้วอัปโหลดอีกครั้ง");
    }
    thumbKey = `${base}.thumb.webp`;
    await storage.put(key, buf, file.mime, buf.length);
  } else {
    await storage.put(key, file.body, file.mime, file.size);
    if (cover) {
      try {
        dims = await makeThumb(storage, `${base}.thumb.webp`, cover);
        thumbKey = `${base}.thumb.webp`;
      } catch {
        /* ไม่มีรูปปกก็ใช้ปกกราฟิกแทน */
      }
    }
  }
  const existing = await db.select({ id: media.id }).from(media).where(eq(media.contentId, contentId));
  const [m] = await db.insert(media).values({ contentId, kind: chk.kind, storageKey: key, thumbKey, mime: file.mime, sizeBytes: file.size, width: dims.width, height: dims.height, sortOrder: existing.length }).returning();
  await logActivity(db, content.projectId, actorId, chk.kind === "image" ? "เพิ่มรูป" : "เพิ่มวิดีโอ", contentId);
  return m;
}

export async function setVideoCover(db: DB, storage: Storage, actorId: string, mediaId: string, cover: Buffer) {
  const [m] = await db.select().from(media).where(eq(media.id, mediaId));
  if (!m) throw new NotFoundError();
  await requireEditable(db, actorId, m.contentId);
  const thumbKey = m.storageKey.replace(/\.[^.]+$/, ".thumb.webp");
  const dims = await makeThumb(storage, thumbKey, cover);
  await db.update(media).set({ thumbKey, ...dims }).where(eq(media.id, mediaId));
}

export async function removeMedia(db: DB, storage: Storage, actorId: string, mediaId: string) {
  const [m] = await db.select().from(media).where(eq(media.id, mediaId));
  if (!m) return;
  await requireEditable(db, actorId, m.contentId);
  await db.delete(media).where(eq(media.id, mediaId));
  await storage.delete(m.storageKey);
  if (m.thumbKey) await storage.delete(m.thumbKey);
}

export async function reorderMedia(db: DB, actorId: string, contentId: string, orderedIds: string[]) {
  await requireEditable(db, actorId, contentId);
  for (const [i, id] of orderedIds.entries()) await db.update(media).set({ sortOrder: i }).where(and(eq(media.id, id), eq(media.contentId, contentId)));
}

/** หาไฟล์ตาม key แล้วตรวจว่าผู้ใช้เป็นสมาชิกโปรเจกต์ (ใช้ตอนส่งไฟล์ให้เบราว์เซอร์) */
export async function authorizeFile(db: DB, userId: string, key: string): Promise<Media | null> {
  const [m] = await db.select().from(media).where(eq(media.storageKey, key));
  const row = m ?? (await db.select().from(media).where(eq(media.thumbKey, key)))[0];
  if (!row) return null;
  await contentAccess(db, userId, row.contentId);
  return row;
}

export const listMedia = (db: DB, contentId: string) => db.select().from(media).where(eq(media.contentId, contentId)).orderBy(asc(media.sortOrder));

async function streamToBuffer(s: NodeJS.ReadableStream, max: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let n = 0;
  for await (const c of s) {
    n += (c as Buffer).length;
    if (n > max) throw new Error(UPLOAD_MSG.image);
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks);
}
