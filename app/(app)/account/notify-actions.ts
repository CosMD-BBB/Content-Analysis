"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/src/db/client";
import { markAllRead, setPrefs } from "@/src/notify/service";
import { act, type ActionResult } from "@/src/server/act";

export async function markAllReadAction(): Promise<void> {
  await act(async (u) => { await markAllRead(getDb(), u.id); });
}

export async function prefsAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  return act(async (u) => {
    await setPrefs(getDb(), u.id, { email: f.get("email") === "on", inApp: f.get("inApp") === "on" });
    revalidatePath("/account");
    return { ok: true, message: "บันทึกการแจ้งเตือนแล้ว" };
  });
}
