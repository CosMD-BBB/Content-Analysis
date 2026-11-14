"use client";

import Link from "next/link";
import { useState } from "react";
import { contentActionAction, favoriteAction } from "@/app/(app)/p/[projectId]/content/actions";
import { ActionForm } from "./action-form";
import { Icon } from "./icon";
import { Submit } from "./submit";

export type ActionKey = "edit" | "start" | "submit" | "withdraw" | "approve" | "requestChanges" | "schedule" | "unschedule" | "publish";

const LABEL: Record<Exclude<ActionKey, "edit" | "publish" | "requestChanges">, { text: string; icon?: string; cls: string }> = {
  start: { text: "เริ่มทำ", cls: "btn" },
  submit: { text: "ส่งให้อนุมัติ", icon: "send", cls: "btn primary" },
  withdraw: { text: "ดึงกลับมาแก้", icon: "undo", cls: "btn" },
  approve: { text: "อนุมัติ", icon: "check", cls: "btn ok" },
  schedule: { text: "ตั้งเวลาตามที่กำหนด", icon: "clock", cls: "btn" },
  unschedule: { text: "ยกเลิกตั้งเวลา", cls: "btn" },
};

export function ContentActions({ projectId, contentId, actions, publishSlot }: { projectId: string; contentId: string; actions: ActionKey[]; publishSlot?: React.ReactNode }) {
  const [asking, setAsking] = useState(false);
  const hidden = (
    <>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="contentId" value={contentId} />
    </>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="act-bar">
        {actions.includes("edit") && <Link className="btn" href={`/p/${projectId}/content/${contentId}/edit`}><Icon name="pen" size="sm" />แก้ไข</Link>}
        {(Object.keys(LABEL) as (keyof typeof LABEL)[]).filter((a) => actions.includes(a)).map((a) => (
          <ActionForm key={a} action={contentActionAction}>
            {hidden}
            <input type="hidden" name="action" value={a} />
            <Submit className={LABEL[a].cls}>{LABEL[a].icon && <Icon name={LABEL[a].icon!} size="sm" />}{LABEL[a].text}</Submit>
          </ActionForm>
        ))}
        {actions.includes("requestChanges") && !asking && <button className="btn bad" type="button" onClick={() => setAsking(true)}><Icon name="pen" size="sm" />ขอแก้ไข</button>}
        {actions.includes("publish") && publishSlot}
      </div>
      {asking && (
        <ActionForm action={contentActionAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {hidden}
          <input type="hidden" name="action" value="requestChanges" />
          <textarea className="textarea" name="comment" required autoFocus placeholder="บอกสิ่งที่ต้องแก้ ให้เจ้าของงานเข้าใจและแก้ได้เลย" aria-label="สิ่งที่ต้องแก้" style={{ minHeight: 80 }} />
          <div className="row"><button type="button" className="btn" onClick={() => setAsking(false)}>ยกเลิก</button><Submit className="btn bad">ส่งกลับให้แก้</Submit></div>
        </ActionForm>
      )}
    </div>
  );
}

export function FavoriteButton({ projectId, contentId, on }: { projectId: string; contentId: string; on: boolean }) {
  return (
    <ActionForm action={favoriteAction} style={{ display: "inline-flex" }}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="contentId" value={contentId} />
      <button type="submit" className={`star${on ? " on" : ""}`} aria-label={on ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"} title="รายการโปรด">
        <Icon name="star" filled={on} />
      </button>
    </ActionForm>
  );
}
