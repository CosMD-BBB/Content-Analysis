import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { can, type Perm } from "../access/permissions";
import { requireUser } from "../auth/session";
import { getDb } from "../db/client";
import { ForbiddenError } from "../lib/errors";
import { getProjectContext } from "../projects/service";

/** ข้อมูลโปรเจกต์สำหรับหน้าเว็บ (ไม่ใช่สมาชิก → 404) */
export const projectPage = cache(async (projectId: string) => {
  const user = await requireUser();
  try {
    const ctx = await getProjectContext(getDb(), user.id, projectId);
    return { user, ...ctx, can: (p: Perm) => can(ctx.role, p) };
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
});
