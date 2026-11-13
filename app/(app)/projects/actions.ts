"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/src/db/client";
import { acceptInvite, createProject } from "@/src/projects/service";
import { act, type ActionResult } from "@/src/server/act";

export async function createProjectAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  let id = "";
  const r = await act(async (u) => {
    const p = await createProject(getDb(), u.id, { name: String(f.get("name") ?? ""), color: String(f.get("color") ?? "") });
    id = p.id;
  });
  if (id) redirect(`/p/${id}/settings`);
  return r;
}

export async function acceptInviteAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  let pid = "";
  const r = await act(async (u) => {
    const res = await acceptInvite(getDb(), u.id, String(f.get("token") ?? ""));
    if (!res.ok) return { error: res.error };
    pid = res.projectId;
  });
  if (pid) redirect(`/p/${pid}`);
  return r;
}
