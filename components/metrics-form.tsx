"use client";

import { useState } from "react";
import { metricsAction } from "@/app/(app)/p/[projectId]/reports/actions";
import { ActionForm } from "./action-form";
import { Icon } from "./icon";
import { Submit } from "./submit";

const FIELDS = [["views", "ยอดวิว"], ["likes", "ไลก์"], ["comments", "คอมเมนต์"], ["shares", "แชร์"], ["clicks", "คลิก"]] as const;

export function MetricsForm({ projectId, ccId, initial }: { projectId: string; ccId: string; initial?: Partial<Record<string, number | null>> }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="btn sm" onClick={() => setOpen(true)}><Icon name="pen" size="sm" />กรอกตัวเลข</button>;
  return (
    <ActionForm action={async (s, f) => { const r = await metricsAction(s, f); if (r?.ok) setOpen(false); return r; }} className="metrics-form">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="ccId" value={ccId} />
      {FIELDS.map(([k, label]) => (
        <label key={k} className="field"><span className="lbl">{label}</span><input className="input num" name={k} inputMode="numeric" pattern="[0-9,]*" defaultValue={initial?.[k] ?? ""} /></label>
      ))}
      <div className="row"><button type="button" className="btn sm" onClick={() => setOpen(false)}>ยกเลิก</button><Submit className="btn primary sm">บันทึก</Submit></div>
    </ActionForm>
  );
}
