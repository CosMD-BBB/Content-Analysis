import { Readable } from "node:stream";
import { currentUser } from "@/src/auth/session";
import { getDb } from "@/src/db/client";
import { ForbiddenError } from "@/src/lib/errors";
import { authorizeFile } from "@/src/media/service";
import { getStorage } from "@/src/media/storage";

/** ส่งไฟล์ให้เฉพาะสมาชิกโปรเจกต์ของไฟล์นั้น */
export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const key = (await params).key.join("/");
  try {
    const m = await authorizeFile(getDb(), user.id, key);
    if (!m) return new Response("Not found", { status: 404 });
    const obj = await getStorage().get(key);
    if (!obj) return new Response("Not found", { status: 404 });
    const isThumb = key.endsWith(".thumb.webp");
    return new Response(Readable.toWeb(obj.body) as ReadableStream, {
      headers: {
        "Content-Type": isThumb ? "image/webp" : m.mime,
        ...(obj.size ? { "Content-Length": String(obj.size) } : {}),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    throw e;
  }
}
