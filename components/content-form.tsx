"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveContentAction } from "@/app/(app)/p/[projectId]/content/actions";
import { CATALOG, publishMode } from "@/src/channels/catalog";
import { captionWarnings } from "@/src/content/validation";
import { FORMATS, PLATFORMS, type ChannelStatus, type Format, type Platform } from "@/src/db/constants";
import { errText, FORMAT_LABEL } from "@/src/i18n/th";
import { ChannelBadge } from "./badges";
import { Icon } from "./icon";

export type ContentFormInitial = {
  contentId?: string;
  version?: number;
  title: string;
  workTypeId: string | null;
  format: Format;
  pillarId: string | null;
  date: string;
  time: string;
  ownerId: string;
  platforms: Platform[];
  caption: string;
  captionOverrides: Partial<Record<Platform, string>>;
  assetLink: string;
};

export function ContentForm(props: {
  projectId: string;
  initial: ContentFormInitial;
  workTypes: { id: string; name: string; manualOnly: boolean }[];
  pillars: { id: string; name: string }[];
  owners: { id: string; name: string }[];
  channels: { platform: Platform; status: ChannelStatus }[];
  canAssign: boolean;
  statusNote?: string;
}) {
  const [state, action, pending] = useActionState(saveContentAction, undefined);
  const [format, setFormat] = useState<Format>(props.initial.format);
  const [workTypeId, setWorkTypeId] = useState(props.initial.workTypeId ?? "");
  const [platforms, setPlatforms] = useState<Platform[]>(props.initial.platforms);
  const [caption, setCaption] = useState(props.initial.caption);
  const [overrides, setOverrides] = useState(props.initial.captionOverrides);
  const [tab, setTab] = useState<"main" | Platform>("main");
  const wt = props.workTypes.find((w) => w.id === workTypeId);
  const warnings = useMemo(() => captionWarnings(caption, overrides, platforms), [caption, overrides, platforms]);
  const isEdit = !!props.initial.contentId;
  const toggle = (p: Platform) => setPlatforms(platforms.includes(p) ? platforms.filter((x) => x !== p) : PLATFORMS.filter((x) => x === p || platforms.includes(x)));
  const cancelHref = isEdit ? `/p/${props.projectId}/content/${props.initial.contentId}` : `/p/${props.projectId}/library`;

  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="projectId" value={props.projectId} />
      {isEdit && <input type="hidden" name="contentId" value={props.initial.contentId} />}
      {isEdit && <input type="hidden" name="version" value={props.initial.version} />}
      {props.statusNote && <div className="banner warn"><Icon name="info" /><div>{props.statusNote}</div></div>}
      <div className="field">
        <label htmlFor="f-title">ชื่อคอนเทนต์</label>
        <input className="input" id="f-title" name="title" required maxLength={200} defaultValue={props.initial.title} placeholder="เช่น รีวิวกันแดดสูตรใหม่ ใช้จริง 7 วัน" />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="f-wt">ประเภทงาน</label>
          <select className="select" id="f-wt" name="workTypeId" value={workTypeId} onChange={(e) => setWorkTypeId(e.target.value)}>
            <option value="">ไม่ระบุ</option>
            {props.workTypes.map((w) => <option key={w.id} value={w.id}>{w.name}{w.manualOnly ? " (ทำเองเสมอ)" : ""}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-format">รูปแบบ</label>
          <select className="select" id="f-format" name="format" value={format} onChange={(e) => setFormat(e.target.value as Format)}>
            {FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-pillar">หมวด</label>
          <select className="select" id="f-pillar" name="pillarId" defaultValue={props.initial.pillarId ?? ""}>
            <option value="">ไม่ระบุ</option>
            {props.pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-owner">ผู้รับผิดชอบ</label>
          {props.canAssign ? (
            <select className="select" id="f-owner" name="ownerId" defaultValue={props.initial.ownerId}>
              {props.owners.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          ) : (
            <>
              <input type="hidden" name="ownerId" value={props.initial.ownerId} />
              <input className="input" id="f-owner" disabled value={props.owners.find((o) => o.id === props.initial.ownerId)?.name ?? ""} />
            </>
          )}
        </div>
        <div className="field">
          <label htmlFor="f-date">วันที่ลง</label>
          <input className="input" type="date" id="f-date" name="date" required defaultValue={props.initial.date} />
        </div>
        <div className="field">
          <label htmlFor="f-time">เวลา (เวลาไทย)</label>
          <input className="input" type="time" id="f-time" name="time" required defaultValue={props.initial.time} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="f-asset">ลิงก์ไฟล์งาน (ถ้ามี)</label>
        <input className="input" type="url" id="f-asset" name="assetLink" defaultValue={props.initial.assetLink} placeholder="https://drive.google.com/… หรือ Canva" />
      </div>
      <div className="field">
        <span className="lbl">ช่องทาง</span>
        <span className="hint">ป้ายสีบอกว่าระบบจะโพสต์ให้ หรือต้องโพสต์เอง ตามการเชื่อมต่อและประเภทงาน</span>
        <div className="ch-pick">
          {PLATFORMS.map((p) => {
            const m = publishMode(props.channels.find((c) => c.platform === p), format, wt);
            return (
              <label className="ch-opt" key={p}>
                <input type="checkbox" name="platforms" value={p} checked={platforms.includes(p)} onChange={() => toggle(p)} />
                <ChannelBadge p={p} />
                <span className="t">
                  <b>{CATALOG[p].name}</b>
                  <span className="small" style={{ color: m.mode === "auto" ? "var(--ok)" : "var(--bad)" }}>{m.mode === "auto" ? "โพสต์อัตโนมัติ" : "ต้องโพสต์เอง"}</span>
                  <span className="small faint">{m.reason}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="field">
        <span className="lbl">แคปชัน</span>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "main"} onClick={() => setTab("main")}>แคปชันหลัก</button>
          {platforms.map((p) => (
            <button type="button" role="tab" key={p} aria-selected={tab === p} onClick={() => setTab(p)}>
              <ChannelBadge p={p} />{CATALOG[p].name}{overrides[p]?.trim() ? <span className="n">แยก</span> : null}
            </button>
          ))}
        </div>
        <textarea className="textarea" name="caption" value={caption} onChange={(e) => setCaption(e.target.value)} hidden={tab !== "main"} placeholder="แคปชันที่ใช้ร่วมทุกช่องทาง" aria-label="แคปชันหลัก" />
        {platforms.map((p) => (
          <textarea
            key={p} className="textarea" name={`caption_${p}`} hidden={tab !== p} aria-label={`แคปชันสำหรับ ${CATALOG[p].name}`}
            value={overrides[p] ?? ""} onChange={(e) => setOverrides({ ...overrides, [p]: e.target.value })}
            placeholder={`เว้นว่าง = ใช้แคปชันหลัก · เขียนแยกสำหรับ ${CATALOG[p].name} ได้ที่นี่`}
          />
        ))}
        <span className="hint">{[...(tab === "main" ? caption : overrides[tab] || caption)].length.toLocaleString()} ตัวอักษร</span>
        {warnings.map((w) => <span key={w} className="small" style={{ color: "var(--warn)" }}>⚠ {w}</span>)}
      </div>
      {state?.error && <p className="small" role="alert" style={{ color: "var(--bad)" }}>{state.message ?? errText(state.error)}</p>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Link className="btn" href={cancelHref}>ยกเลิก</Link>
        {!isEdit && <button className="btn" type="submit" name="as" value="idea" disabled={pending}>บันทึกเป็นไอเดีย</button>}
        <button className="btn primary" type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "สร้างและเริ่มทำ"}</button>
      </div>
    </form>
  );
}
