"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Icon } from "./icon";
import { toast } from "./toast";

const MB = 1024 * 1024;
const IMAGE = ["image/jpeg", "image/png", "image/webp"];
const VIDEO = ["video/mp4", "video/quicktime"];

type Row = { name: string; progress: number; error?: string; done?: boolean };

function check(f: File): string | null {
  if (IMAGE.includes(f.type)) return f.size > 20 * MB ? "รูปต้องไม่เกิน 20 MB" : null;
  if (VIDEO.includes(f.type)) return f.size > 500 * MB ? "วิดีโอต้องไม่เกิน 500 MB" : null;
  return "รองรับเฉพาะรูป JPG, PNG, WebP และวิดีโอ MP4, MOV";
}

function send(url: string, body: Blob, type: string, onProgress: (p: number) => void): Promise<{ id?: string; error?: string }> {
  return new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open("POST", url);
    x.setRequestHeader("Content-Type", type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      try { resolve(JSON.parse(x.responseText)); } catch { resolve({ error: "อัปโหลดไม่สำเร็จ" }); }
    };
    x.onerror = () => resolve({ error: "การเชื่อมต่อขาด ลองใหม่อีกครั้ง" });
    x.send(body);
  });
}

/** จับเฟรมแรกของวิดีโอเป็นรูปปก (JPEG) */
function firstFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.src = URL.createObjectURL(file);
    const done = (b: Blob | null) => { URL.revokeObjectURL(v.src); resolve(b); };
    v.onloadeddata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d")?.drawImage(v, 0, 0);
      c.toBlob((b) => done(b), "image/jpeg", 0.85);
    };
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
  });
}

export function MediaUploader({ contentId }: { contentId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [drag, setDrag] = useState(false);

  async function upload(files: FileList | File[]) {
    const list = [...files];
    const start = rows.length;
    setRows((r) => [...r, ...list.map((f) => ({ name: f.name, progress: 0, error: check(f) ?? undefined }))]);
    let okCount = 0;
    for (const [i, f] of list.entries()) {
      const idx = start + i;
      const patch = (p: Partial<Row>) => setRows((r) => r.map((x, j) => (j === idx ? { ...x, ...p } : x)));
      if (check(f)) continue;
      const res = await send(`/api/upload?contentId=${contentId}`, f, f.type, (p) => patch({ progress: p }));
      if (res.error || !res.id) { patch({ error: res.error ?? "อัปโหลดไม่สำเร็จ" }); continue; }
      if (VIDEO.includes(f.type)) {
        const frame = await firstFrame(f);
        if (frame) await send(`/api/upload?mediaId=${res.id}&cover=1`, frame, "image/jpeg", () => {});
      }
      patch({ progress: 1, done: true });
      okCount++;
    }
    if (okCount) { toast(`อัปโหลดแล้ว ${okCount} ไฟล์`); router.refresh(); }
  }

  return (
    <div
      className={`uploader${drag ? " drag" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
    >
      <Icon name="upload" />
      <div>ลากรูปหรือวิดีโอมาวางที่นี่ หรือ <button type="button" className="btn sm" onClick={() => input.current?.click()}>เลือกไฟล์</button></div>
      <div className="small faint">รูป JPG, PNG, WebP ไม่เกิน 20 MB · วิดีโอ MP4, MOV ไม่เกิน 500 MB · รูปจาก iPhone ให้ตั้งกล้องเป็น “เข้ากันได้มากที่สุด” หรือส่งออกเป็น JPG</div>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" hidden onChange={(e) => e.target.files && upload(e.target.files)} />
      {rows.length > 0 && (
        <div className="up-list">
          {rows.map((r, i) => (
            <div className="up-row" key={i}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}{r.error && <span style={{ color: "var(--bad)" }}> · {r.error}</span>}</span>
              {r.error ? <span className="small" style={{ color: "var(--bad)" }}>ไม่สำเร็จ</span> : r.done ? <span className="small" style={{ color: "var(--ok)" }}>เสร็จแล้ว</span> : <span className="up-bar"><i style={{ width: `${Math.round(r.progress * 100)}%` }} /></span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
