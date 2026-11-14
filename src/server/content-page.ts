import "server-only";
import { notFound } from "next/navigation";
import { getContentDetail } from "../content/service";
import { getDb } from "../db/client";
import { ForbiddenError, NotFoundError } from "../lib/errors";
import { listMembers } from "../projects/service";

export async function loadDetail(userId: string, contentId: string) {
  try {
    return await getContentDetail(getDb(), userId, contentId);
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof NotFoundError) notFound();
    throw e;
  }
}

/** คนที่รับผิดชอบงานได้ (ไม่รวมฝ่ายวิเคราะห์) */
export async function ownerOptions(userId: string, projectId: string) {
  return (await listMembers(getDb(), userId, projectId)).filter((m) => m.role !== "analyst").map((m) => ({ id: m.userId, name: m.name }));
}
