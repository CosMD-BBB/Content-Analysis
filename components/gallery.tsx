"use client";

import { removeMediaAction } from "@/app/(app)/p/[projectId]/content/actions";
import { ActionForm } from "./action-form";
import { Cover } from "./cover";
import { Icon } from "./icon";
import { Submit } from "./submit";

export function Gallery({ projectId, contentId, items, editable, title, format }: {
  projectId: string; contentId: string; editable: boolean; title: string; format: "reel" | "video" | "image" | "carousel" | "article";
  items: { id: string; kind: "image" | "video"; thumbKey: string | null; storageKey: string }[];
}) {
  if (!items.length) return <p className="small muted">ยังไม่มีรูปหรือวิดีโอ{editable ? " เพิ่มได้ด้านล่าง" : ""}</p>;
  return (
    <div className="gallery">
      {items.map((m, i) => (
        <div className="gitem" key={m.id}>
          <a href={`/files/${m.storageKey}`} target="_blank" rel="noopener" title={`เปิดไฟล์ที่ ${i + 1}`}>
            <Cover c={{ title, format, thumbKey: m.thumbKey, kind: m.kind }} size="md" />
          </a>
          {editable && (
            <ActionForm action={removeMediaAction} className="gdel">
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="contentId" value={contentId} />
              <input type="hidden" name="mediaId" value={m.id} />
              <Submit className="btn sm icon"><span aria-label="ลบไฟล์"><Icon name="trash" size="sm" /></span></Submit>
            </ActionForm>
          )}
        </div>
      ))}
    </div>
  );
}
