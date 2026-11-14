"use client";

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveContentAction } from "@/app/(app)/p/[projectId]/content/actions";
import type { ContentStatus, Format, Platform } from "@/src/db/constants";
import { errText, STATUS_LABEL, STATUS_TONE } from "@/src/i18n/th";
import { ChannelBadges, StatusPill } from "./badges";
import { Cover } from "./cover";
import { Icon } from "./icon";
import { toast } from "./toast";

export type CalItem = {
  id: string; title: string; time: string; day: string; status: ContentStatus; format: Format; pillarColor?: string;
  thumbKey?: string | null; kind?: "image" | "video" | null; platforms: Platform[]; ownerName: string; workType?: string; canMove: boolean;
};

const DOW = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

function Chip({ it, projectId }: { it: CalItem; projectId: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: it.id, disabled: !it.canMove, data: it });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 20, position: "relative" as const } : undefined;
  return (
    <div ref={setNodeRef} style={style} className={`chip cal-chip s-${STATUS_TONE[it.status]}${isDragging ? " dragging" : ""}`} title={`${it.title} · ${STATUS_LABEL[it.status]}`}>
      {it.canMove && <span className="grip" {...listeners} {...attributes} aria-label={`ลากเพื่อย้ายวัน: ${it.title}`}><Icon name="grip" size="sm" /></span>}
      <Link href={`/p/${projectId}/content/${it.id}`} className="cal-link">
        <Cover c={{ title: it.title, format: it.format, pillarColor: it.pillarColor, thumbKey: it.thumbKey, kind: it.kind }} size="xs" />
        <span className="tm">{it.time}</span>
        <span className="tt">{it.title}</span>
      </Link>
    </div>
  );
}

function Cell({ day, items, projectId, inMonth, today, selected, onSelect, canCreate }: {
  day: string; items: CalItem[]; projectId: string; inMonth: boolean; today: boolean; selected: boolean; onSelect: () => void; canCreate: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day });
  return (
    <div ref={setNodeRef} className={`cell${inMonth ? "" : " out"}${today ? " today" : ""}${selected ? " sel" : ""}${isOver ? " over" : ""}`} onClick={onSelect}>
      <div className="dn">
        <span>{Number(day.slice(8))}</span>
        {canCreate && <Link className="add" href={`/p/${projectId}/content/new?date=${day}`} aria-label={`เพิ่มคอนเทนต์วันที่ ${Number(day.slice(8))}`} onClick={(e) => e.stopPropagation()}><Icon name="plus" size="sm" /></Link>}
      </div>
      {items.slice(0, 4).map((it) => <Chip key={it.id} it={it} projectId={projectId} />)}
      {items.length > 4 && <span className="more">+ อีก {items.length - 4}</span>}
      <div className="dots">{items.map((it) => <span key={it.id} className={`dot d-${STATUS_TONE[it.status]}`} />)}</div>
    </div>
  );
}

export function CalendarBoard({ projectId, days, month, items, today, canCreate }: { projectId: string; days: string[]; month: string; items: CalItem[]; today: string; canCreate: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState(days.includes(today) ? today : days[7]);
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState<Record<string, string>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const byDay: Record<string, CalItem[]> = {};
  for (const it of items) (byDay[local[it.id] ?? it.day] ||= []).push(it);

  function onDragEnd(e: DragEndEvent) {
    const it = e.active.data.current as CalItem | undefined;
    const to = e.over?.id as string | undefined;
    if (!it || !to || to === (local[it.id] ?? it.day)) return;
    setLocal((l) => ({ ...l, [it.id]: to }));
    startTransition(async () => {
      const r = await moveContentAction(projectId, it.id, to);
      if (r?.error) { toast(errText(r.error)); setLocal((l) => { const n = { ...l }; delete n[it.id]; return n; }); }
      else { toast(r?.message ?? "ย้ายวันแล้ว"); router.refresh(); }
    });
  }

  const sel = byDay[selected] ?? [];
  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="cal">
          {DOW.map((d) => <div className="dow" key={d}>{d}</div>)}
          {days.map((d) => (
            <Cell key={d} day={d} items={byDay[d] ?? []} projectId={projectId} inMonth={!month || d.startsWith(month)} today={d === today} selected={d === selected} onSelect={() => setSelected(d)} canCreate={canCreate} />
          ))}
        </div>
      </DndContext>
      <section className="card">
        <div className="card-head">
          <h2>วันที่ {Number(selected.slice(8))}/{Number(selected.slice(5, 7))}</h2>
          <span className="pill t-neutral plain">{sel.length} ชิ้น</span>
          {canCreate && <Link className="btn sm sp" href={`/p/${projectId}/content/new?date=${selected}`}><Icon name="plus" size="sm" />เพิ่มงานวันนี้</Link>}
        </div>
        {sel.length ? (
          <div className="list">
            {sel.map((it) => (
              <Link key={it.id} href={`/p/${projectId}/content/${it.id}`} className="li" style={{ color: "inherit", textDecoration: "none" }}>
                <span className="num muted" style={{ width: 44 }}>{it.time}</span>
                <Cover c={{ title: it.title, format: it.format, pillarColor: it.pillarColor, thumbKey: it.thumbKey, kind: it.kind }} size="sm" />
                <div className="grow"><div className="title">{it.title}</div><div className="sub">{it.workType ? `${it.workType} · ` : ""}{it.ownerName}</div></div>
                <ChannelBadges list={it.platforms} />
                <StatusPill s={it.status} />
              </Link>
            ))}
          </div>
        ) : <div className="empty">ยังไม่มีคอนเทนต์ในวันนี้</div>}
      </section>
    </>
  );
}
