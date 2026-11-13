"use client";

import { useState } from "react";
import { addCommentAction, resolveCommentAction } from "@/app/(app)/p/[projectId]/content/comment-actions";
import { ActionForm } from "./action-form";
import { Icon } from "./icon";
import { Submit } from "./submit";

type C = { id: string; body: string; userName: string; when: string; mediaId: string | null; pinX: number | null; pinY: number | null; resolved: boolean };
type M = { id: string; kind: "image" | "video"; storageKey: string; thumbKey: string | null };

/** ความคิดเห็น: คลิกบนรูปเพื่อปักหมุดว่าต้องแก้ตรงไหน */
export function PinComments({ projectId, contentId, comments, media }: { projectId: string; contentId: string; comments: C[]; media: M[] }) {
  const images = media.filter((m) => m.kind === "image" || m.thumbKey);
  const [active, setActive] = useState(images[0]?.id);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const cur = images.find((m) => m.id === active);
  const numbered = comments.filter((c) => c.mediaId).map((c, i) => ({ ...c, n: i + 1 }));
  const numOf = (id: string) => numbered.find((x) => x.id === id)?.n;
  const hidden = (
    <>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="contentId" value={contentId} />
    </>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {cur && (
        <>
          {images.length > 1 && (
            <div className="row" style={{ gap: 6 }}>
              {images.map((m, i) => (
                <button key={m.id} type="button" className={`btn sm${m.id === active ? " primary" : ""}`} onClick={() => { setActive(m.id); setPin(null); }}>รูป {i + 1}</button>
              ))}
            </div>
          )}
          <div className="pin-stage" onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setPin({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) });
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/files/${cur.kind === "image" ? cur.storageKey : cur.thumbKey}`} alt="รูปสำหรับปักหมุดความคิดเห็น" />
            {numbered.filter((c) => c.mediaId === cur.id).map((c) => (
              <span key={c.id} className={`pin${c.resolved ? " done" : ""}`} style={{ left: `${c.pinX! * 100}%`, top: `${c.pinY! * 100}%` }} title={c.body}>{c.n}</span>
            ))}
            {pin && <span className="pin new" style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}>+</span>}
          </div>
          <p className="small faint">คลิกบนรูปตรงจุดที่อยากให้แก้ แล้วพิมพ์ความคิดเห็นด้านล่าง</p>
        </>
      )}
      <ActionForm action={async (s, f) => { const r = await addCommentAction(s, f); if (r?.ok) setPin(null); return r; }} resetOnSuccess style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {hidden}
        {pin && cur && (
          <>
            <input type="hidden" name="mediaId" value={cur.id} />
            <input type="hidden" name="pinX" value={pin.x} />
            <input type="hidden" name="pinY" value={pin.y} />
            <span className="small" style={{ color: "var(--accent)" }}><Icon name="pin" size="sm" /> ปักหมุดบนรูปแล้ว <button type="button" className="btn sm ghost" onClick={() => setPin(null)}>ยกเลิกหมุด</button></span>
          </>
        )}
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <textarea className="textarea" name="body" required placeholder={pin ? "ตรงนี้ต้องแก้อะไร" : "พิมพ์ความคิดเห็น"} aria-label="ความคิดเห็น" style={{ minHeight: 60 }} />
          <Submit className="btn"><span aria-label="ส่ง"><Icon name="send" size="sm" /></span></Submit>
        </div>
      </ActionForm>
      {comments.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comments.map((c) => (
            <div className="comment" key={c.id} style={c.resolved ? { opacity: 0.55 } : undefined}>
              <span className="av" style={{ background: "var(--accent)" }}>{c.userName.slice(0, 1)}</span>
              <div className="bubble">
                <div className="small row" style={{ gap: 6 }}>
                  {numOf(c.id) && <span className="pin inline">{numOf(c.id)}</span>}
                  <b>{c.userName}</b> <span className="faint">{c.when}</span>
                  <ActionForm action={resolveCommentAction} style={{ marginLeft: "auto" }}>
                    {hidden}
                    <input type="hidden" name="commentId" value={c.id} />
                    <input type="hidden" name="resolved" value={c.resolved ? "0" : "1"} />
                    <Submit className="btn sm ghost">{c.resolved ? "เปิดอีกครั้ง" : "แก้แล้ว"}</Submit>
                  </ActionForm>
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{c.body}</div>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="small muted">ยังไม่มีความคิดเห็น</p>}
    </div>
  );
}
