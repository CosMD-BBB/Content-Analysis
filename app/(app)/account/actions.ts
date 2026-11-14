"use server";

import { changePassword } from "@/src/auth/service";
import { getDb } from "@/src/db/client";
import { act, type ActionResult } from "@/src/server/act";

export async function changePasswordAction(_: ActionResult, f: FormData) {
  return act(async (u) => {
    const r = await changePassword(getDb(), u.id, String(f.get("old") ?? ""), String(f.get("new") ?? ""));
    return r.ok ? { ok: true } : { error: r.error };
  });
}
