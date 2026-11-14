"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/src/db/client";
import { archiveProject, renameProject, updatePillars, updateWorkTypes } from "@/src/projects/service";
import { act, type ActionResult } from "@/src/server/act";

const pid = (f: FormData) => String(f.get("projectId"));
const list = (f: FormData) => {
  try { return JSON.parse(String(f.get("items") ?? "[]")); } catch { throw new Error("validation"); }
};

export async function renameAction(_: ActionResult, f: FormData) {
  return act(async (u) => {
    await renameProject(getDb(), u.id, pid(f), { name: String(f.get("name") ?? ""), color: String(f.get("color") ?? "#3E4FE0") });
    revalidatePath(`/p/${pid(f)}`, "layout");
    return { ok: true, message: "บันทึกแล้ว" };
  });
}

export async function workTypesAction(_: ActionResult, f: FormData) {
  return act(async (u) => {
    await updateWorkTypes(getDb(), u.id, pid(f), list(f));
    revalidatePath(`/p/${pid(f)}/settings`);
    return { ok: true, message: "บันทึกประเภทงานแล้ว" };
  });
}

export async function pillarsAction(_: ActionResult, f: FormData) {
  return act(async (u) => {
    await updatePillars(getDb(), u.id, pid(f), list(f));
    revalidatePath(`/p/${pid(f)}/settings`);
    return { ok: true, message: "บันทึกหมวดแล้ว" };
  });
}

export async function archiveAction(_: ActionResult, f: FormData) {
  const r = await act(async (u) => {
    if (String(f.get("confirm") ?? "") !== "ปิดโปรเจกต์") return { error: "validation" };
    await archiveProject(getDb(), u.id, pid(f));
  });
  if (r?.ok) redirect("/projects");
  return r;
}
