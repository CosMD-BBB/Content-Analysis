"use client";

import { useState } from "react";
import type { Guide } from "@/src/channels/guides";
import { Icon } from "./icon";

/** ตัวช่วยเชื่อมต่อทีละขั้น (ระยะ 1: ขั้นเข้าสู่ระบบยังเปิดไม่ได้ จะแสดง “เร็วๆ นี้”) */
export function ConnectWizard({ name, badge, guide, canConnect }: { name: string; badge: React.ReactNode; guide: Guide; canConnect: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ticks, setTicks] = useState<boolean[]>(guide.prepare.map(() => false));
  const manual = guide.availability === "manual_only";
  const ready = manual || ticks.every(Boolean);
  const label = manual ? "ดูวิธีโพสต์เองและบันทึกผล" : canConnect ? "เชื่อมต่อบัญชี" : "ดูวิธีเชื่อมต่อ";
  if (!open) return <button type="button" className={`btn${manual || !canConnect ? "" : " primary"}`} onClick={() => setOpen(true)}><Icon name={manual ? "hand" : "link"} size="sm" />{label}</button>;
  const s = guide.steps[step];
  return (
    <div className="modal-wrap">
      <div className="scrim" onClick={() => setOpen(false)} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={`เชื่อมต่อ ${name}`} style={{ zIndex: 51, width: "min(720px, 100%)" }}>
        <div className="m-head">{badge}<h2>{manual ? `${name}: โพสต์เองและบันทึกผล` : `เชื่อมต่อ ${name}`}</h2><button type="button" className="btn icon ghost" style={{ marginLeft: "auto" }} onClick={() => setOpen(false)} aria-label="ปิด"><Icon name="x" /></button></div>
        <div className="m-body">
          <ol className="wiz-steps">
            {guide.steps.map((x, i) => (
              <li key={i} className={i === step ? "cur" : i < step ? "done" : ""}><button type="button" onClick={() => setStep(i)}><span className="wiz-n">{i < step ? "✓" : i + 1}</span>{x.title}</button></li>
            ))}
          </ol>
          <div className="wiz-body">
            <h3>{step + 1}. {s.title}</h3>
            <p>{s.body}</p>
            {step === 0 && !manual && (
              <div className="wiz-check">
                <b className="small">เช็กให้ครบทุกข้อก่อนไปขั้นถัดไป</b>
                {guide.prepare.map((p, i) => (
                  <label className="check" key={i}><input type="checkbox" checked={ticks[i]} onChange={(e) => setTicks(ticks.map((t, j) => (j === i ? e.target.checked : t)))} />{p}</label>
                ))}
                <a className="small" href={guide.settingsUrl} target="_blank" rel="noopener">เปิด{guide.settingsLabel} <Icon name="ext" size="sm" /></a>
              </div>
            )}
            {step === 1 && !manual && (
              <div className="banner warn">
                <Icon name="clock" />
                <div>
                  <b>เร็วๆ นี้</b> · ปุ่มเข้าสู่ระบบ {name} จะเปิดใช้เมื่อ{guide.waitingFor} ระหว่างนี้งานที่ส่งไป {name} จะอยู่ในแท็บ “ต้องโพสต์เอง” อ่านขั้นที่เหลือไว้ก่อนได้
                  <div style={{ marginTop: 8 }}><button type="button" className="btn primary sm" disabled title="ยังเปิดใช้ไม่ได้"><Icon name="link" size="sm" />เข้าสู่ระบบ {name}</button></div>
                </div>
              </div>
            )}
          </div>
          <details className="wiz-faq">
            <summary>ปัญหาที่พบบ่อย ({guide.troubleshooting.length})</summary>
            {guide.troubleshooting.map((t, i) => <div key={i} className="faq-item"><b>{t.q}</b><p className="small muted">{t.a}</p></div>)}
          </details>
        </div>
        <div className="m-foot">
          {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}>ย้อนกลับ</button>}
          {step < guide.steps.length - 1 ? (
            <button type="button" className="btn primary" disabled={step === 0 && !ready} onClick={() => setStep(step + 1)} title={step === 0 && !ready ? "ติ๊กเช็กลิสต์ให้ครบก่อน" : undefined}>ถัดไป</button>
          ) : (
            <button type="button" className="btn primary" onClick={() => setOpen(false)}>เข้าใจแล้ว</button>
          )}
        </div>
      </div>
    </div>
  );
}
