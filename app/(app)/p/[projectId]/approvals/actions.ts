"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/src/db/client";
import { notifyPublished } from "@/src/notify/service";
import { confirmManualPost, publishNow } from "@/src/publish/service";
import { act, type ActionResult } from "@/src/server/act";
import { enqueueChannelPublishes } from "@/src/worker/queue";

const s = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function publishAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  return act(async (u) => {
    const r = await publishNow(getDb(), u.id, s(f, "contentId"));
    if (!r.ok) return { error: r.error };
    await enqueueChannelPublishes(r.auto);
    await notifyPublished(getDb(), s(f, "contentId"), u.id);
    revalidatePath(`/p/${s(f, "projectId")}`, "layout");
    return { ok: true, message: r.manual ? `เผยแพร่แล้ว · มี ${r.manual} ช่องทางที่ต้องโพสต์เอง ดูในแท็บ “ต้องโพสต์เอง”` : "เผยแพร่แล้ว ระบบกำลังโพสต์ให้ทุกช่องทาง" };
  });
}

export async function manualDoneAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  return act(async (u) => {
    const r = await confirmManualPost(getDb(), u.id, s(f, "ccId"), s(f, "url"));
    if (!r.ok) return { error: r.error };
    revalidatePath(`/p/${s(f, "projectId")}`, "layout");
    return { ok: true, message: "ปิดงานแล้ว อย่าลืมกรอกตัวเลขผลลัพธ์ภายหลัง" };
  });
}
