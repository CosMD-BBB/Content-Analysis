import Link from "next/link";
import { ChannelBadge, StatusPill, WorkTypeChip } from "@/components/badges";
import { ContentActions, type ActionKey } from "@/components/content-actions";
import { Cover } from "@/components/cover";
import { Icon } from "@/components/icon";
import { PageHead } from "@/components/page-head";
import { ManualPostRow, PublishButton } from "@/components/publish-controls";
import { CATALOG, publishMode } from "@/src/channels/catalog";
import { listContents, type ContentRow } from "@/src/content/service";
import { nextStatus, type ContentAction } from "@/src/content/state";
import { getDb } from "@/src/db/client";
import { listMedia } from "@/src/media/service";
import { formatThai } from "@/src/lib/time";
import { projectPage } from "@/src/server/context";

export default async function ApprovalsPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { projectId } = await params;
  const { tab: t } = await searchParams;
  const tab = t === "ready" || t === "manual" ? t : "review";
  const ctx = await projectPage(projectId);
  const all = await listContents(getDb(), ctx.user.id, projectId);
  const review = all.filter((c) => c.status === "review").sort((a, b) => +a.scheduledAt - +b.scheduledAt);
  const ready = all.filter((c) => c.status === "approved" || c.status === "scheduled").sort((a, b) => +a.scheduledAt - +b.scheduledAt);
  const manual = all.filter((c) => c.status === "published").flatMap((c) => c.channels.filter((x) => x.publishState === "manual_todo").map((ch) => ({ c, ch })));
  const pillar = (id: string | null) => ctx.pillars.find((p) => p.id === id)?.color;
  const wtOf = (c: ContentRow) => ctx.workTypes.find((w) => w.id === c.workTypeId);
  const tabLink = (k: string, label: string, n: number) => (
    <Link role="tab" aria-selected={tab === k} href={`?tab=${k}`} className="tab-a">{label}<span className="n">{n}</span></Link>
  );

  const card = (c: ContentRow) => {
    const wt = wtOf(c);
    const acts = (["approve", "requestChanges", "schedule", "unschedule", "publish"] as ContentAction[]).filter((a) => nextStatus(c.status, a, ctx.role, c.ownerId === ctx.user.id)) as ActionKey[];
    const manualCount = c.channels.filter((x) => publishMode(ctx.channels.find((k) => k.platform === x.platform), c.format, wt).mode === "manual").length;
    return (
      <section className="card qcard2" key={c.id}>
        <Link href={`/p/${projectId}/content/${c.id}`} className="q-cover">
          <Cover c={{ title: c.title, format: c.format, pillarColor: pillar(c.pillarId), thumbKey: c.cover?.thumbKey, kind: c.cover?.kind }} size="md" />
        </Link>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="row" style={{ gap: 8 }}><StatusPill s={c.status} /><WorkTypeChip name={wt?.name} /></div>
          <h3><Link href={`/p/${projectId}/content/${c.id}`} style={{ color: "inherit" }}>{c.title}</Link></h3>
          <div className="small muted">{c.ownerName} · {c.status === "scheduled" ? "จะโพสต์" : "กำหนดลง"} {formatThai(c.scheduledAt, "datetime")}</div>
          {c.caption && <div className="caption-box" style={{ maxHeight: 120 }}>{c.caption}</div>}
          <div className="cap-row">
            {c.channels.map((x) => {
              const m = publishMode(ctx.channels.find((k) => k.platform === x.platform), c.format, wt);
              return (
                <span className="mode" key={x.id} title={m.reason}>
                  <ChannelBadge p={x.platform} />
                  <span style={{ color: m.mode === "auto" ? "var(--ok)" : "var(--bad)" }}><Icon name={m.mode === "auto" ? "bolt" : "hand"} size="sm" /></span>
                  {m.mode === "auto" ? "โพสต์อัตโนมัติ" : "ต้องโพสต์เอง"}
                </span>
              );
            })}
          </div>
          {acts.length > 0 && (
            <ContentActions projectId={projectId} contentId={c.id} actions={acts} publishSlot={<PublishButton projectId={projectId} contentId={c.id} manualCount={manualCount} />} />
          )}
        </div>
      </section>
    );
  };

  return (
    <>
      <PageHead eyebrow="ขั้นตอนก่อนขึ้นโพสต์" title="อนุมัติ & เผยแพร่" sub="ครีเอเตอร์ส่งงาน → หัวหน้าอนุมัติ → กดเผยแพร่หรือตั้งเวลา ช่องทางที่ระบบโพสต์ให้ไม่ได้จะมาอยู่ในแท็บ “ต้องโพสต์เอง”" />
      <div className="tabs" role="tablist">{tabLink("review", "รออนุมัติ", review.length)}{tabLink("ready", "พร้อมเผยแพร่", ready.length)}{tabLink("manual", "ต้องโพสต์เอง", manual.length)}</div>
      {tab === "review" && (
        <>
          {!ctx.can("approve") && <div className="banner"><Icon name="info" /><div>คุณดูคิวได้ แต่การอนุมัติทำได้เฉพาะหัวหน้าคอนเทนต์และผู้ดูแลโปรเจกต์</div></div>}
          {review.length ? review.map(card) : <div className="card empty">ไม่มีงานรออนุมัติ</div>}
        </>
      )}
      {tab === "ready" && (
        <>
          {!ctx.can("publish") && <div className="banner"><Icon name="info" /><div>การกดเผยแพร่ทำได้เฉพาะหัวหน้าคอนเทนต์และผู้ดูแลโปรเจกต์</div></div>}
          <div className="banner"><Icon name="clock" /><div>งานที่ “ตั้งเวลาแล้ว” ระบบจะเผยแพร่เองเมื่อถึงเวลา ถ้าแก้งานหลังตั้งเวลา งานจะกลับไปรออนุมัติและจะไม่ถูกโพสต์</div></div>
          {ready.length ? ready.map(card) : <div className="card empty">ยังไม่มีงานที่อนุมัติแล้ว</div>}
        </>
      )}
      {tab === "manual" && (
        <>
          <div className="banner warn"><Icon name="hand" /><div>ช่องทางที่ระบบโพสต์ให้ไม่ได้ (ไม่มี API, ยังไม่ได้เชื่อมต่อ, API ไม่รองรับ หรือเป็นงานที่ต้องทำเองเช่น Ads) คัดลอกแคปชันและดาวน์โหลดไฟล์ไปโพสต์ แล้ววางลิงก์โพสต์เพื่อปิดงาน</div></div>
          {manual.length ? (
            <section className="card">
              <div className="list">
                {await Promise.all(manual.map(async ({ c, ch }) => {
                  const files = (await listMedia(getDb(), c.id)).map((m, i) => ({ href: `/files/${m.storageKey}`, label: `ไฟล์ ${i + 1}` }));
                  return (
                    <div className="pub-row" key={ch.id}>
                      <Cover c={{ title: c.title, format: c.format, pillarColor: pillar(c.pillarId), thumbKey: c.cover?.thumbKey, kind: c.cover?.kind }} size="sm" />
                      <div className="what">
                        <div className="line1"><ChannelBadge p={ch.platform} /><b>{c.title}</b><span className="pill t-bad">ต้องโพสต์เอง</span></div>
                        <div className="small muted">{CATALOG[ch.platform].name} · {ch.reason} · ผู้รับผิดชอบ {c.ownerName}</div>
                        {ctx.can("manual") && (ctx.can("editAny") || c.ownerId === ctx.user.id) ? (
                          <ManualPostRow projectId={projectId} ccId={ch.id} caption={ch.captionOverride || c.caption} platformName={CATALOG[ch.platform].name} platformUrl={CATALOG[ch.platform].url} files={files} />
                        ) : <span className="small faint">รอผู้รับผิดชอบโพสต์และยืนยัน</span>}
                      </div>
                    </div>
                  );
                }))}
              </div>
            </section>
          ) : <div className="card empty">ไม่มีงานที่ต้องโพสต์เอง</div>}
        </>
      )}
    </>
  );
}
