import Link from "next/link";
import { ChannelBadges, StatusPill } from "@/components/badges";
import { Cover } from "@/components/cover";
import { Icon } from "@/components/icon";
import { PageHead } from "@/components/page-head";
import { overview } from "@/src/content/overview";
import { getDb } from "@/src/db/client";
import { ROLE_DESC, ROLE_LABEL } from "@/src/i18n/th";
import { bangkokDayKey, bangkokParts, bangkokTime, DAYS_SHORT, formatThai, fromBangkokInput, MONTHS_FULL } from "@/src/lib/time";
import { projectPage } from "@/src/server/context";

const ago = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 6e4);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} ชม.ที่แล้ว` : `${Math.round(h / 24)} วันที่แล้ว`;
};

export default async function OverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await projectPage(projectId);
  const o = await overview(getDb(), ctx.user.id, projectId, ctx.role);
  const b = `/p/${projectId}`;
  const now = bangkokParts(new Date());
  const greet = now.hour < 12 ? "สวัสดีตอนเช้า" : now.hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  const pillar = (id: string | null) => ctx.pillars.find((p) => p.id === id)?.color;
  const delta = o.viewsPrev30 ? (o.views30 - o.viewsPrev30) / o.viewsPrev30 : null;
  return (
    <>
      <PageHead
        eyebrow={`${DAYS_SHORT[now.weekday]} ${now.day} ${MONTHS_FULL[now.month]} ${now.year + 543}`}
        title={`${greet}, ${ctx.user.name}`}
        sub={<>บทบาท <b>{ROLE_LABEL[ctx.role]}</b> ใน {ctx.project.name} · {ROLE_DESC[ctx.role]}</>}
      />
      <div className="kpis">
        <Link className={`tile${o.counts.review ? " warn" : ""}`} href={`${b}/approvals`}><span className="eyebrow">รออนุมัติ</span><span className="k-val">{o.counts.review}</span><span className="k-sub">งานที่ส่งมาให้หัวหน้าตรวจ</span></Link>
        <Link className="tile" href={`${b}/approvals?tab=ready`}><span className="eyebrow">พร้อมเผยแพร่</span><span className="k-val">{o.counts.ready}</span><span className="k-sub">ตั้งเวลาแล้ว {o.counts.scheduled}</span></Link>
        <Link className={`tile${o.counts.manual ? " bad" : ""}`} href={`${b}/approvals?tab=manual`}><span className="eyebrow">ต้องโพสต์เอง</span><span className="k-val">{o.counts.manual}</span><span className="k-sub">ช่องทางที่ระบบโพสต์ให้ไม่ได้</span></Link>
        <Link className="tile" href={`${b}/reports`}><span className="eyebrow">ยอดวิว 30 วัน</span><span className="k-val">{o.views30.toLocaleString()}</span>
          <span className="k-sub">{delta == null ? <span className="faint">ยังไม่มีข้อมูลช่วงก่อน</span> : <><span className={delta >= 0 ? "up" : "down"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(0)}%</span> เทียบ 30 วันก่อน</>}</span></Link>
      </div>
      <div className="cols">
        <section className="card">
          <div className="card-head"><h2>งานของฉัน</h2><span className="pill t-neutral plain">{o.tasks.length}</span></div>
          {o.tasks.length ? (
            <div className="list">
              {o.tasks.slice(0, 10).map((t, i) => (
                <Link className="li" key={i} href={`${b}/content/${t.content.id}${t.anchor ?? ""}`} style={{ color: "inherit", textDecoration: "none" }}>
                  <Cover c={{ title: t.content.title, format: t.content.format, pillarColor: pillar(t.content.pillarId), thumbKey: t.content.cover?.thumbKey, kind: t.content.cover?.kind }} size="sm" />
                  <div className="grow"><div className="title">{t.text}</div>{t.sub && <div className="sub">{t.sub}</div>}</div>
                  <span className={`task-ico t-${t.tone}`}><Icon name={t.icon} size="sm" /></span>
                </Link>
              ))}
            </div>
          ) : <div className="empty">ไม่มีงานค้าง</div>}
        </section>
        <section className="card">
          <div className="card-head"><h2>ความเคลื่อนไหวล่าสุด</h2></div>
          {o.log.length ? (
            <div className="list">
              {o.log.map((l) => (
                <div className="li" key={l.id} style={{ cursor: "default" }}>
                  <span className="av" style={{ background: "var(--accent)" }}>{l.userName.slice(0, 1)}</span>
                  <div className="grow"><div className="title"><b>{l.userName}</b> {l.text}{l.title ? ` · ${l.title}` : ""}</div><div className="sub">{ago(l.createdAt)}</div></div>
                </div>
              ))}
            </div>
          ) : <div className="empty">ยังไม่มีความเคลื่อนไหว</div>}
        </section>
      </div>
      <section className="card">
        <div className="card-head"><h2>7 วันข้างหน้า</h2><Link className="sp small" href={`${b}/calendar`}>เปิดปฏิทิน</Link></div>
        <div className="scroll-x">
          <div className="week">
            {o.days.map((d, i) => {
              const items = o.week.filter((c) => bangkokDayKey(c.scheduledAt) === d);
              const dt = fromBangkokInput(d, "12:00");
              return (
                <div className={`wday${i === 0 ? " today" : ""}`} key={d}>
                  <div className="wd">{DAYS_SHORT[bangkokParts(dt).weekday]} {formatThai(dt, "short")}</div>
                  {items.map((c) => (
                    <Link key={c.id} href={`${b}/content/${c.id}`} className="wk-item">
                      <Cover c={{ title: c.title, format: c.format, pillarColor: pillar(c.pillarId), thumbKey: c.cover?.thumbKey, kind: c.cover?.kind }} size="xs" />
                      <span className="tt"><span className="tm">{bangkokTime(c.scheduledAt)}</span> {c.title}</span>
                    </Link>
                  ))}
                  {!items.length && <span className="small faint">ว่าง</span>}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h2>ผลงานดีสุด 30 วัน</h2><Link className="sp small" href={`${b}/reports`}>ดูรายงาน</Link></div>
        {o.top.length ? (
          <div className="list">
            {o.top.map((c, i) => (
              <Link className="li" key={c.id} href={`${b}/content/${c.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                <span className="num faint" style={{ width: 18 }}>{i + 1}</span>
                <Cover c={{ title: c.title, format: c.format, pillarColor: pillar(c.pillarId), thumbKey: c.cover?.thumbKey, kind: c.cover?.kind }} size="sm" />
                <div className="grow"><div className="title">{c.title}</div><div className="sub">{formatThai(c.scheduledAt, "short")}</div></div>
                <ChannelBadges list={c.channels.map((x) => x.platform)} />
                <b className="num">{c.views.toLocaleString()}</b>
              </Link>
            ))}
          </div>
        ) : <div className="empty">ยังไม่มีผลงานที่เผยแพร่ใน 30 วันนี้</div>}
      </section>
      {o.week.length === 0 && o.tasks.length === 0 && (
        <div className="banner"><Icon name="info" /><div>เริ่มต้นด้วยการกด “สร้างคอนเทนต์” ที่มุมขวาบน หรือเพิ่มสมาชิกทีมที่เมนู “ทีมและสิทธิ์” <StatusPill s="idea" /></div></div>
      )}
    </>
  );
}
