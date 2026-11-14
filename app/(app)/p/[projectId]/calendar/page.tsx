import Link from "next/link";
import { Suspense } from "react";
import { CalendarBoard, type CalItem } from "@/components/calendar-board";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { PageHead } from "@/components/page-head";
import { canEditContent } from "@/src/access/permissions";
import { CATALOG } from "@/src/channels/catalog";
import { monthGrid, weekGrid } from "@/src/content/calendar";
import { listContents } from "@/src/content/service";
import { getDb } from "@/src/db/client";
import { CONTENT_STATUSES, PLATFORMS } from "@/src/db/constants";
import { STATUS_LABEL, STATUS_TONE } from "@/src/i18n/th";
import { addDaysKey, bangkokDayKey, bangkokTime, fromBangkokInput, MONTHS_FULL } from "@/src/lib/time";
import { ownerOptions } from "@/src/server/content-page";
import { projectPage } from "@/src/server/context";
import { readFilters, type SP } from "@/src/server/filters";

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<SP> }) {
  const { projectId } = await params;
  const sp = await searchParams;
  const ctx = await projectPage(projectId);
  const today = bangkokDayKey(new Date());
  const view = sp.view === "week" ? "week" : "month";
  const anchor = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : today;
  const [y, m] = anchor.split("-").map(Number);
  const days = view === "week" ? weekGrid(anchor) : monthGrid(y, m - 1);
  const rows = await listContents(getDb(), ctx.user.id, projectId, { ...readFilters(sp), from: fromBangkokInput(days[0], "00:00"), to: fromBangkokInput(addDaysKey(days.at(-1)!, 1), "00:00") });
  const owners = await ownerOptions(ctx.user.id, projectId);
  const items: CalItem[] = rows.map((c) => ({
    id: c.id, title: c.title, time: bangkokTime(c.scheduledAt), day: bangkokDayKey(c.scheduledAt), status: c.status, format: c.format,
    pillarColor: ctx.pillars.find((p) => p.id === c.pillarId)?.color, thumbKey: c.cover?.thumbKey, kind: c.cover?.kind,
    platforms: c.channels.map((x) => x.platform), ownerName: c.ownerName, workType: ctx.workTypes.find((w) => w.id === c.workTypeId)?.name,
    canMove: canEditContent(ctx.role, c.ownerId === ctx.user.id, c.status),
  }));
  const shift = (n: number) => {
    if (view === "week") return addDaysKey(anchor, 7 * n);
    const t = new Date(Date.UTC(y, m - 1 + n, 1));
    return t.toISOString().slice(0, 10);
  };
  const qs = (d: string, v = view) => {
    const n = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    n.set("d", d); n.set("view", v);
    return `?${n.toString()}`;
  };
  const title = view === "week" ? `สัปดาห์ ${Number(days[0].slice(8))}/${Number(days[0].slice(5, 7))} – ${Number(days[6].slice(8))}/${Number(days[6].slice(5, 7))}` : `${MONTHS_FULL[m - 1]} ${y + 543}`;
  return (
    <>
      <PageHead eyebrow="ตารางงานทีม" title="ปฏิทินคอนเทนต์" sub="ลากงานไปวางวันอื่นเพื่อย้ายวัน (เวลาเดิม) · งานที่อนุมัติแล้วถ้าย้ายวันจะกลับไปรออนุมัติใหม่" />
      <div className="cal-bar">
        <Link className="btn icon" href={qs(shift(-1))} aria-label="ก่อนหน้า"><Icon name="left" /></Link>
        <div className="cal-title">{title}</div>
        <Link className="btn icon" href={qs(shift(1))} aria-label="ถัดไป"><Icon name="right" /></Link>
        <Link className="btn sm" href={qs(today)}>วันนี้</Link>
        <div className="seg">
          <Link href={qs(anchor, "month")} aria-pressed={view === "month"} className="seg-a">เดือน</Link>
          <Link href={qs(anchor, "week")} aria-pressed={view === "week"} className="seg-a">สัปดาห์</Link>
        </div>
      </div>
      <Suspense>
        <FilterBar
          selects={[
            { name: "platform", label: "ทุกช่องทาง", options: PLATFORMS.map((p) => ({ value: p, label: CATALOG[p].name })) },
            { name: "status", label: "ทุกสถานะ", options: CONTENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
            { name: "workType", label: "ทุกประเภทงาน", options: ctx.workTypes.map((w) => ({ value: w.id, label: w.name })) },
            { name: "owner", label: "ทุกคน", options: owners.map((o) => ({ value: o.id, label: o.name })) },
          ]}
        />
      </Suspense>
      <div className="legend">{CONTENT_STATUSES.map((s) => <span key={s}><i className={`dot d-${STATUS_TONE[s]}`} />{STATUS_LABEL[s]}</span>)}</div>
      <CalendarBoard projectId={projectId} days={days} month={view === "month" ? anchor.slice(0, 7) : ""} items={items} today={today} canCreate={ctx.can("create")} />
    </>
  );
}
