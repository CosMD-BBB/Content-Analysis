import { Readable } from "node:stream";
import { currentUser } from "@/src/auth/session";
import { getDb } from "@/src/db/client";
import { ForbiddenError } from "@/src/lib/errors";
import { addMedia, checkUpload, MAX_IMAGE, setVideoCover } from "@/src/media/service";
import { getStorage } from "@/src/media/storage";

const json = (status: number, body: unknown) => Response.json(body, { status });

async function readLimited(req: Request, max: number) {
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > max) throw new Error("too large");
  return buf;
}

/**
 * อัปโหลดไฟล์แบบส่ง body ตรงๆ (ไม่ใช่ multipart) เพื่อให้วิดีโอใหญ่ไหลเข้าที่เก็บได้โดยไม่ค้างในหน่วยความจำ
 * POST /api/upload?contentId=...           body = ไฟล์
 * POST /api/upload?mediaId=...&cover=1     body = รูปปกวิดีโอ (JPEG จากเฟรมแรก)
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return json(401, { error: "เข้าสู่ระบบก่อน" });
  const url = new URL(req.url);
  const mime = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  const size = Number(req.headers.get("content-length") ?? 0);
  try {
    if (url.searchParams.get("cover")) {
      await setVideoCover(getDb(), getStorage(), user.id, url.searchParams.get("mediaId") ?? "", await readLimited(req, MAX_IMAGE));
      return json(200, { ok: true });
    }
    const chk = checkUpload(mime, size);
    if (!chk.ok) return json(400, { error: chk.message });
    if (!req.body) return json(400, { error: "ไม่พบไฟล์" });
    const body = chk.kind === "image" ? await readLimited(req, MAX_IMAGE) : Readable.fromWeb(req.body as never);
    const m = await addMedia(getDb(), getStorage(), user.id, url.searchParams.get("contentId") ?? "", { body, mime, size });
    return json(200, { ok: true, id: m.id, kind: m.kind });
  } catch (e) {
    if (e instanceof ForbiddenError) return json(403, { error: "คุณไม่มีสิทธิ์แก้งานนี้" });
    const msg = e instanceof Error ? e.message : "";
    if (/[฀-๿]/.test(msg)) return json(400, { error: msg });
    console.error(e);
    return json(500, { error: "อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง" });
  }
}
