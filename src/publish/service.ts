import { and, eq, lte } from "drizzle-orm";
import { requireMember } from "../access/guard";
import { can } from "../access/permissions";
import { publishMode } from "../channels/catalog";
import { logActivity } from "../content/service";
import { nextStatus } from "../content/state";
import type { DB } from "../db/client";
import { channels, contentChannels, contents, workTypes, type Content, type ContentChannel, type Platform } from "../db/schema";
import { ForbiddenError, NotFoundError } from "../lib/errors";

export interface PublishAdapter {
  publish(content: Content, channel: ContentChannel): Promise<{ url: string }>;
}
/** ตัวโพสต์จริงของแต่ละแพลตฟอร์ม (ระยะ 1 ยังไม่มี จะเพิ่มในระยะ 2–4) */
export const adapters: Partial<Record<Platform, PublishAdapter>> = {};

export const MAX_ATTEMPTS = 3;

type PublishResult = { ok: true; auto: string[]; manual: number } | { ok: false; error: "invalid_action" };

/** เผยแพร่จริง (ไม่ตรวจสิทธิ์ ใช้ร่วมกันระหว่างกดเอง และ worker ที่โพสต์ตามเวลา) */
async function doPublish(db: DB, content: Content, actorId: string | null, byAdapters = adapters): Promise<PublishResult> {
  if (content.status !== "approved" && content.status !== "scheduled") return { ok: false, error: "invalid_action" };
  const [projectChannels, wt, ccs] = await Promise.all([
    db.select().from(channels).where(eq(channels.projectId, content.projectId)),
    content.workTypeId ? db.select().from(workTypes).where(eq(workTypes.id, content.workTypeId)).then((r) => r[0]) : Promise.resolve(undefined),
    db.select().from(contentChannels).where(eq(contentChannels.contentId, content.id)),
  ]);
  const auto: string[] = [];
  let manual = 0;
  await db.transaction(async (tx) => {
    // ล็อกแถวและเช็กสถานะอีกครั้ง กันกดเผยแพร่ซ้ำ หรือ worker กับคนกดพร้อมกัน
    const [cur] = await tx.select().from(contents).where(eq(contents.id, content.id)).for("update");
    if (!cur || (cur.status !== "approved" && cur.status !== "scheduled")) throw new Error("already_published");
    const now = new Date();
    await tx.update(contents).set({ status: "published", scheduledAt: cur.scheduledAt > now ? now : cur.scheduledAt, updatedAt: now }).where(eq(contents.id, content.id));
    for (const cc of ccs) {
      const m = publishMode(projectChannels.find((c) => c.platform === cc.platform), cur.format, wt);
      if (m.mode === "auto" && byAdapters[cc.platform]) {
        await tx.update(contentChannels).set({ publishState: "pending", reason: null }).where(eq(contentChannels.id, cc.id));
        auto.push(cc.id);
      } else {
        await tx.update(contentChannels).set({ publishState: "manual_todo", reason: m.mode === "auto" ? "ยังไม่มีตัวโพสต์อัตโนมัติของช่องทางนี้" : m.reason }).where(eq(contentChannels.id, cc.id));
        manual++;
      }
    }
    await logActivity(tx, cur.projectId, actorId, actorId ? "เผยแพร่" : "โพสต์ตามเวลาที่ตั้งไว้", cur.id);
  }).catch((e) => {
    if (e instanceof Error && e.message === "already_published") return;
    throw e;
  });
  return { ok: true, auto, manual };
}

/** กดเผยแพร่ตอนนี้ (ต้องมีสิทธิ์ publish และงานต้องอนุมัติแล้ว) คืนรายการช่องทางที่ต้องส่งเข้าคิวโพสต์อัตโนมัติ */
export async function publishNow(db: DB, actorId: string, contentId: string, byAdapters = adapters): Promise<PublishResult> {
  const [c] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!c) throw new NotFoundError();
  const { role } = await requireMember(db, actorId, c.projectId);
  if (!nextStatus(c.status, "publish", role, c.ownerId === actorId)) return { ok: false, error: "invalid_action" };
  return doPublish(db, c, actorId, byAdapters);
}

/** worker: เผยแพร่งานที่ตั้งเวลาไว้และถึงเวลาแล้ว (เฉพาะสถานะ scheduled เท่านั้น) */
export async function publishDue(db: DB, now = new Date(), byAdapters = adapters): Promise<{ published: string[]; auto: string[] }> {
  const due = await db.select().from(contents).where(and(eq(contents.status, "scheduled"), lte(contents.scheduledAt, now)));
  const published: string[] = [];
  const auto: string[] = [];
  for (const c of due) {
    const r = await doPublish(db, c, null, byAdapters);
    if (r.ok) { published.push(c.id); auto.push(...r.auto); }
  }
  return { published, auto };
}

/** worker: โพสต์ช่องทางเดียวผ่าน adapter; พลาดครบจำนวนครั้ง → กลายเป็นงานต้องโพสต์เอง */
export async function runChannelPublish(db: DB, contentChannelId: string, attempt: number, byAdapters = adapters): Promise<"posted" | "manual_todo"> {
  const [cc] = await db.select().from(contentChannels).where(eq(contentChannels.id, contentChannelId));
  if (!cc || cc.publishState !== "pending") return "manual_todo";
  const [c] = await db.select().from(contents).where(eq(contents.id, cc.contentId));
  const adapter = byAdapters[cc.platform];
  try {
    if (!c || c.status !== "published" || !adapter) throw new Error("ไม่พบตัวโพสต์ของช่องทางนี้");
    const { url } = await adapter.publish(c, cc);
    await db.update(contentChannels).set({ publishState: "posted", postUrl: url, postedAt: new Date(), reason: null }).where(eq(contentChannels.id, cc.id));
    return "posted";
  } catch (e) {
    if (attempt < MAX_ATTEMPTS) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    await db.update(contentChannels).set({ publishState: "manual_todo", reason: `โพสต์อัตโนมัติไม่สำเร็จ ${MAX_ATTEMPTS} ครั้ง: ${msg}`.slice(0, 300) }).where(eq(contentChannels.id, cc.id));
    return "manual_todo";
  }
}

/** ยืนยันว่าโพสต์เองแล้ว พร้อมลิงก์โพสต์ */
export async function confirmManualPost(db: DB, actorId: string, contentChannelId: string, url: string): Promise<{ ok: true } | { ok: false; error: "invalid_url" | "invalid_action" }> {
  const [cc] = await db.select().from(contentChannels).where(eq(contentChannels.id, contentChannelId));
  if (!cc) throw new NotFoundError();
  const [c] = await db.select().from(contents).where(eq(contents.id, cc.contentId));
  const { role } = await requireMember(db, actorId, c.projectId);
  if (!can(role, "manual") || (!can(role, "editAny") && c.ownerId !== actorId)) throw new ForbiddenError();
  if (cc.publishState !== "manual_todo" && cc.publishState !== "failed") return { ok: false, error: "invalid_action" };
  let ok = false;
  try { ok = new URL(url.trim()).protocol === "https:"; } catch { ok = false; }
  if (!ok) return { ok: false, error: "invalid_url" };
  await db.update(contentChannels).set({ publishState: "manual_done", postUrl: url.trim(), postedAt: new Date(), postedBy: actorId }).where(eq(contentChannels.id, cc.id));
  await logActivity(db, c.projectId, actorId, "ยืนยันโพสต์เองแล้ว", c.id);
  return { ok: true };
}
