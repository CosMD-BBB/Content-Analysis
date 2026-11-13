"use client";

import { useActionState, useRef } from "react";
import { addMemberAction, changeRoleAction, inviteAction, removeMemberAction, resetPasswordAction } from "@/app/(app)/p/[projectId]/team/actions";
import { errText, ROLE_LABEL } from "@/src/i18n/th";
import { ActionForm } from "./action-form";
import { Icon } from "./icon";
import { Submit } from "./submit";
import { toast } from "./toast";

const roleOptions = (Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>);

export function RoleSelect({ projectId, userId, role }: { projectId: string; userId: string; role: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <ActionForm action={changeRoleAction} className="inline-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="userId" value={userId} />
      <select className="select" name="role" defaultValue={role} aria-label="บทบาท" onChange={(e) => e.currentTarget.form?.requestSubmit()} style={{ flex: "0 0 auto" }}>
        {roleOptions}
      </select>
      <span ref={ref as never} hidden />
    </ActionForm>
  );
}

export function RemoveMember({ projectId, userId, name }: { projectId: string; userId: string; name: string }) {
  return (
    <ActionForm action={removeMemberAction} className="inline-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="userId" value={userId} />
      <Submit className="btn sm ghost"><span title={`นำ ${name} ออก`}><Icon name="trash" size="sm" /></span></Submit>
    </ActionForm>
  );
}

export function AddMember({ projectId }: { projectId: string }) {
  return (
    <ActionForm action={addMemberAction} className="inline-form" resetOnSuccess>
      <input type="hidden" name="projectId" value={projectId} />
      <input className="input" type="email" name="email" placeholder="อีเมลที่สมัครไว้แล้ว" required aria-label="อีเมล" />
      <select className="select" name="role" defaultValue="creator" aria-label="บทบาท" style={{ flex: "0 0 auto" }}>{roleOptions}</select>
      <Submit><Icon name="plus" size="sm" />เพิ่มเข้าโปรเจกต์</Submit>
    </ActionForm>
  );
}

export function InviteLink({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(inviteAction, undefined);
  const link = state?.ok ? `${location.origin}${new URL(String(state.data), location.origin).pathname}` : "";
  return (
    <form action={action} className="inline-form" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <input type="hidden" name="projectId" value={projectId} />
      <div className="inline-form">
        <select className="select" name="role" defaultValue="creator" aria-label="บทบาทของคนที่จะเชิญ" style={{ flex: "0 0 auto" }}>{roleOptions}</select>
        <Submit className="btn"><Icon name="link" size="sm" />สร้างลิงก์เชิญ</Submit>
      </div>
      {state?.error && <p className="small" style={{ color: "var(--bad)" }}>{errText(state.error)}</p>}
      {link && (
        <div className="copy-box">
          <span style={{ flex: 1 }}>{link}</span>
          <button type="button" className="btn sm" onClick={() => navigator.clipboard.writeText(link).then(() => toast("คัดลอกลิงก์แล้ว"), () => toast("คัดลอกไม่ได้ เลือกข้อความแล้วคัดลอกเอง"))}>
            <Icon name="copy" size="sm" />คัดลอก
          </button>
        </div>
      )}
      {link && <span className="small muted">ส่งลิงก์นี้ให้คนที่จะเชิญ ใช้ได้ 1 ครั้งภายใน 7 วัน</span>}
    </form>
  );
}

/** เจ้าของระบบตั้งรหัสชั่วคราวให้สมาชิกที่ลืมรหัส (เมื่อยังไม่ได้ตั้งค่าส่งอีเมล) */
export function ResetPassword({ userId, name }: { userId: string; name: string }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);
  if (state?.ok)
    return (
      <span className="copy-box" style={{ display: "inline-flex" }}>
        รหัสชั่วคราวของ {name}: <b>{String(state.data)}</b>
        <button type="button" className="btn sm" onClick={() => navigator.clipboard.writeText(String(state.data)).then(() => toast("คัดลอกแล้ว"), () => {})}><Icon name="copy" size="sm" /></button>
      </span>
    );
  return (
    <form action={action} style={{ display: "inline-flex" }}>
      <input type="hidden" name="userId" value={userId} />
      <Submit className="btn sm ghost">รีเซ็ตรหัส</Submit>
    </form>
  );
}
