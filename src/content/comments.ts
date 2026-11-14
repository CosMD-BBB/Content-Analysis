import { and, eq } from "drizzle-orm";
import { can } from "../access/permissions";
import type { DB } from "../db/client";
import { comments, media } from "../db/schema";
import { ForbiddenError, NotFoundError } from "../lib/errors";
import { notify } from "../notify/service";
import { contentAccess } from "./service";

/** ความคิดเห็น (ปักหมุดบนรูปได้: mediaId + pinX/pinY เป็นสัดส่วน 0–1 ต้องมีครบหรือไม่มีเลย) */
export async function addComment(db: DB, actorId: string, contentId: string, input: { body: string; mediaId?: string | null; pinX?: number | null; pinY?: number | null }) {
  await contentAccess(db, actorId, contentId);
  const body = input.body.trim();
  if (!body || body.length > 4000) throw new Error("validation");
  const pinParts = [input.mediaId, input.pinX, input.pinY].filter((v) => v !== undefined && v !== null && v !== "").length;
  if (pinParts !== 0 && pinParts !== 3) throw new Error("validation");
  if (pinParts === 3) {
    if (!(input.pinX! >= 0 && input.pinX! <= 1 && input.pinY! >= 0 && input.pinY! <= 1)) throw new Error("validation");
    const [m] = await db.select().from(media).where(and(eq(media.id, input.mediaId!), eq(media.contentId, contentId)));
    if (!m) throw new Error("validation");
  }
  const [c] = await db.insert(comments).values({ contentId, userId: actorId, body, mediaId: pinParts ? input.mediaId! : null, pinX: pinParts ? input.pinX! : null, pinY: pinParts ? input.pinY! : null }).returning();
  await notify(db, "commented", contentId, actorId);
  return c;
}

export async function resolveComment(db: DB, actorId: string, commentId: string, resolved: boolean) {
  const [c] = await db.select().from(comments).where(eq(comments.id, commentId));
  if (!c) throw new NotFoundError();
  const { role, isOwner } = await contentAccess(db, actorId, c.contentId);
  if (!(c.userId === actorId || isOwner || can(role, "editAny"))) throw new ForbiddenError();
  await db.update(comments).set({ resolvedAt: resolved ? new Date() : null }).where(eq(comments.id, commentId));
}
