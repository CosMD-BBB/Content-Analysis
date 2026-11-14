import "server-only";
import { requireUser } from "../auth/session";
import type { PublicUser } from "../auth/service";
import { ForbiddenError, NotFoundError } from "../lib/errors";

export type ActionResult = { ok?: boolean; error?: string; message?: string; data?: unknown } | undefined;

/** เรียกงานในนามผู้ใช้ที่ล็อกอินอยู่ แปลง error ที่คาดไว้เป็นข้อความให้หน้าเว็บ */
export async function act(fn: (user: PublicUser) => Promise<ActionResult | void>): Promise<ActionResult> {
  const user = await requireUser();
  try {
    return (await fn(user)) ?? { ok: true };
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: "forbidden" };
    if (e instanceof NotFoundError) return { error: "not_found" };
    if (e instanceof Error && e.message === "validation") return { error: "validation" };
    throw e;
  }
}
