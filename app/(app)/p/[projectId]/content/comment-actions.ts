"use server";

import { revalidatePath } from "next/cache";
import { addComment, resolveComment } from "@/src/content/comments";
import { getDb } from "@/src/db/client";
import { act, type ActionResult } from "@/src/server/act";

const s = (f: FormData, k: string) => String(f.get(k) ?? "");
const num = (f: FormData, k: string) => (s(f, k) === "" ? null : Number(s(f, k)));

export async function addCommentAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  return act(async (u) => {
    await addComment(getDb(), u.id, s(f, "contentId"), { body: s(f, "body"), mediaId: s(f, "mediaId") || null, pinX: num(f, "pinX"), pinY: num(f, "pinY") });
    revalidatePath(`/p/${s(f, "projectId")}/content/${s(f, "contentId")}`);
    return { ok: true, message: "ส่งความคิดเห็นแล้ว" };
  });
}

export async function resolveCommentAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  return act(async (u) => {
    await resolveComment(getDb(), u.id, s(f, "commentId"), s(f, "resolved") === "1");
    revalidatePath(`/p/${s(f, "projectId")}/content/${s(f, "contentId")}`);
  });
}
