"use client";

import { useState } from "react";
import { ActionForm } from "./action-form";
import { Icon } from "./icon";
import { Submit } from "./submit";
import type { ActionResult } from "@/src/server/act";

type Item = { id?: string; name: string; manualOnly?: boolean; color?: string };

/** แก้รายการชื่อ (ประเภทงาน / หมวด) แล้วบันทึกทั้งชุด */
export function ListEditor({ projectId, initial, mode, action }: { projectId: string; initial: Item[]; mode: "workType" | "pillar"; action: (s: ActionResult, f: FormData) => Promise<ActionResult> }) {
  const [items, setItems] = useState<Item[]>(initial);
  const set = (i: number, patch: Partial<Item>) => setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <ActionForm action={action} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      {items.map((x, i) => (
        <div className="editable-row" key={x.id ?? `new-${i}`}>
          <input className="input" value={x.name} onChange={(e) => set(i, { name: e.target.value })} aria-label="ชื่อ" />
          {mode === "workType" ? (
            <label className="check small" title="งานประเภทนี้ระบบจะไม่โพสต์ให้ ต้องทำในระบบของแพลตฟอร์มเอง เช่น ตั้งแอดใน Ads Manager">
              <input type="checkbox" checked={!!x.manualOnly} onChange={(e) => set(i, { manualOnly: e.target.checked })} />ทำเองเสมอ
            </label>
          ) : (
            <input type="color" value={x.color ?? "#3E4FE0"} onChange={(e) => set(i, { color: e.target.value })} aria-label="สี" style={{ width: 40, height: 34, border: 0, background: "none" }} />
          )}
          <button type="button" className="btn sm ghost" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="ลบ"><Icon name="trash" size="sm" /></button>
        </div>
      ))}
      <div className="row">
        <button type="button" className="btn sm" onClick={() => setItems([...items, mode === "workType" ? { name: "", manualOnly: false } : { name: "", color: "#5A6077" }])}><Icon name="plus" size="sm" />เพิ่ม</button>
        <Submit className="btn primary sm">บันทึก</Submit>
      </div>
      <p className="small faint">ลบรายการที่มีงานใช้อยู่ งานนั้นจะไม่มี{mode === "workType" ? "ประเภทงาน" : "หมวด"} ต้องเลือกใหม่</p>
    </ActionForm>
  );
}
