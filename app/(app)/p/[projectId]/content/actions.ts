"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applyAction, createContent, moveContent, toggleFavorite, updateContent } from "@/src/content/service";
import type { ContentAction } from "@/src/content/state";
import { getDb } from "@/src/db/client";
import { PLATFORMS, type Platform } from "@/src/db/schema";
import { removeMedia } from "@/src/media/service";
import { getStorage } from "@/src/media/storage";
import { act, type ActionResult } from "@/src/server/act";

const s = (f: FormData, k: string) => String(f.get(k) ?? "");

function readInput(f: FormData) {
  const platforms = f.getAll("platforms").map(String).filter((p): p is Platform => (PLATFORMS as readonly string[]).includes(p));
  const captionOverrides: Partial<Record<Platform, string>> = {};
  for (const p of platforms) {
    const v = s(f, `caption_${p}`);
    if (v.trim()) captionOverrides[p] = v;
  }
  return {
    title: s(f, "title"), workTypeId: s(f, "workTypeId") || null, format: s(f, "format") as never, pillarId: s(f, "pillarId") || null,
    date: s(f, "date"), time: s(f, "time"), ownerId: s(f, "ownerId"), platforms, caption: s(f, "caption"), captionOverrides, assetLink: s(f, "assetLink").trim(),
  };
}

export async function saveContentAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const projectId = s(f, "projectId");
  const id = s(f, "contentId");
  let dest = "";
  const r = await act(async (u) => {
    const input = readInput(f);
    if (!input.platforms.length) return { error: "validation", message: "เลือกอย่างน้อย 1 ช่องทาง" };
    if (id) {
      const res = await updateContent(getDb(), u.id, id, input, Number(s(f, "version")));
      if (!res.ok) return { error: res.error };
      dest = `/p/${projectId}/content/${id}`;
    } else {
      const c = await createContent(getDb(), u.id, projectId, input, { asIdea: s(f, "as") === "idea" });
      dest = `/p/${projectId}/content/${c.id}`;
    }
  });
  if (dest) {
    revalidatePath(`/p/${projectId}`, "layout");
    redirect(dest);
  }
  return r;
}

export async function contentActionAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  return act(async (u) => {
    const action = s(f, "action") as Exclude<ContentAction, "publish">;
    const res = await applyAction(getDb(), u.id, s(f, "contentId"), action, { comment: s(f, "comment") });
    if (!res.ok) return { error: res.error };
    revalidatePath(`/p/${s(f, "projectId")}`, "layout");
    const msg: Record<string, string> = { submit: "ส่งให้หัวหน้าอนุมัติแล้ว", approve: "อนุมัติแล้ว กดเผยแพร่หรือตั้งเวลาได้เลย", requestChanges: "ส่งกลับให้แก้แล้ว", schedule: "ตั้งเวลาแล้ว ระบบจะทำงานตามเวลาที่กำหนด", unschedule: "ยกเลิกการตั้งเวลาแล้ว", start: "เริ่มทำงานแล้ว", withdraw: "ดึงงานกลับมาแก้แล้ว" };
    return { ok: true, message: msg[action] };
  });
}

export async function favoriteAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  return act(async (u) => {
    const on = await toggleFavorite(getDb(), u.id, s(f, "contentId"));
    revalidatePath(`/p/${s(f, "projectId")}`, "layout");
    return { ok: true, message: on ? "เพิ่มในรายการโปรดแล้ว" : "นำออกจากรายการโปรดแล้ว" };
  });
}

export async function removeMediaAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  return act(async (u) => {
    await removeMedia(getDb(), getStorage(), u.id, s(f, "mediaId"));
    revalidatePath(`/p/${s(f, "projectId")}/content/${s(f, "contentId")}`);
    return { ok: true, message: "ลบไฟล์แล้ว" };
  });
}

/** ย้ายวันจากปฏิทิน (ลากวาง) */
export async function moveContentAction(projectId: string, contentId: string, dayKey: string): Promise<ActionResult> {
  return act(async (u) => {
    const res = await moveContent(getDb(), u.id, contentId, dayKey);
    if (!res.ok) return { error: res.error };
    revalidatePath(`/p/${projectId}`, "layout");
    return { ok: true, message: res.status === "review" ? "ย้ายวันแล้ว งานกลับไปรออนุมัติใหม่" : "ย้ายวันแล้ว" };
  });
}
