"use client";

import { useState } from "react";
import { manualDoneAction, publishAction } from "@/app/(app)/p/[projectId]/approvals/actions";
import { ActionForm } from "./action-form";
import { Icon } from "./icon";
import { Submit } from "./submit";
import { toast } from "./toast";

export function PublishButton({ projectId, contentId, manualCount }: { projectId: string; contentId: string; manualCount: number }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <button type="button" className="btn primary" onClick={() => setConfirm(true)}><Icon name="send" size="sm" />เผยแพร่ตอนนี้</button>;
  return (
    <ActionForm action={publishAction} className="inline-form" style={{ flexBasis: "100%" }}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="contentId" value={contentId} />
      <span className="small">{manualCount ? `ยืนยันเผยแพร่? มี ${manualCount} ช่องทางที่ระบบจะสร้างเป็นงานให้โพสต์เอง` : "ยืนยันเผยแพร่ตอนนี้?"}</span>
      <button type="button" className="btn sm" onClick={() => setConfirm(false)}>ยกเลิก</button>
      <Submit className="btn primary sm"><Icon name="send" size="sm" />ยืนยันเผยแพร่</Submit>
    </ActionForm>
  );
}

export function ManualPostRow({ projectId, ccId, caption, platformName, platformUrl, files }: {
  projectId: string; ccId: string; caption: string; platformName: string; platformUrl: string; files: { href: string; label: string }[];
}) {
  const copy = () => navigator.clipboard.writeText(caption).then(() => toast("คัดลอกแคปชันแล้ว"), () => toast("คัดลอกไม่ได้ เลือกข้อความในกล่องแคปชันแทน"));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="manual-box">
        <button type="button" className="btn sm" onClick={copy}><Icon name="copy" size="sm" />คัดลอกแคปชัน</button>
        {files.map((f) => <a key={f.href} className="btn sm" href={f.href} download><Icon name="download" size="sm" />{f.label}</a>)}
        <a className="btn sm" href={platformUrl} target="_blank" rel="noopener"><Icon name="ext" size="sm" />เปิด {platformName}</a>
      </div>
      <ActionForm action={manualDoneAction} className="manual-box">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="ccId" value={ccId} />
        <input className="input" name="url" type="url" required placeholder="วางลิงก์โพสต์ที่โพสต์แล้ว (https://…)" aria-label={`ลิงก์โพสต์ ${platformName}`} />
        <Submit className="btn sm ok"><Icon name="check" size="sm" />โพสต์แล้ว</Submit>
      </ActionForm>
    </div>
  );
}
