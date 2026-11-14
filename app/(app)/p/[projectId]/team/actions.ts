"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/src/db/client";
import { ROLES, type Role } from "@/src/db/schema";
import { addMemberByEmail, changeRole, createInvite, removeMember } from "@/src/projects/service";
import { act, type ActionResult } from "@/src/server/act";

const role = (f: FormData): Role => {
  const r = String(f.get("role"));
  if (!(ROLES as readonly string[]).includes(r)) throw new Error("validation");
  return r as Role;
};

export async function addMemberAction(_: ActionResult, f: FormData) {
  return act(async (u) => {
    const pid = String(f.get("projectId"));
    const r = await addMemberByEmail(getDb(), u.id, pid, String(f.get("email") ?? ""), role(f));
    if (!r.ok) return { error: r.error };
    revalidatePath(`/p/${pid}/team`);
    return { ok: true, message: "เพิ่มสมาชิกแล้ว" };
  });
}

export async function inviteAction(_: ActionResult, f: FormData) {
  return act(async (u) => {
    const token = await createInvite(getDb(), u.id, String(f.get("projectId")), role(f));
    return { ok: true, data: `${process.env.APP_URL ?? ""}/invite/${token}` };
  });
}

export async function changeRoleAction(_: ActionResult, f: FormData) {
  return act(async (u) => {
    const pid = String(f.get("projectId"));
    const r = await changeRole(getDb(), u.id, pid, String(f.get("userId")), role(f));
    if (!r.ok) return { error: r.error };
    revalidatePath(`/p/${pid}/team`);
    return { ok: true, message: "เปลี่ยนบทบาทแล้ว" };
  });
}

export async function removeMemberAction(_: ActionResult, f: FormData) {
  return act(async (u) => {
    const pid = String(f.get("projectId"));
    const r = await removeMember(getDb(), u.id, pid, String(f.get("userId")));
    if (!r.ok) return { error: r.error };
    revalidatePath(`/p/${pid}/team`);
    return { ok: true, message: "นำออกจากโปรเจกต์แล้ว" };
  });
}

export async function resetPasswordAction(_: ActionResult, f: FormData) {
  return act(async (u) => {
    const { adminResetPassword } = await import("@/src/auth/service");
    const temp = await adminResetPassword(getDb(), u.id, String(f.get("userId")));
    return { ok: true, data: temp };
  });
}
