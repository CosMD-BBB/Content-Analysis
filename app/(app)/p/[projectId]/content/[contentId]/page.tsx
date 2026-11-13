import Link from "next/link";
import { notFound } from "next/navigation";
import { ChannelBadge, StatusPill, WorkTypeChip } from "@/components/badges";
import { ContentActions, FavoriteButton, type ActionKey } from "@/components/content-actions";
import { Gallery } from "@/components/gallery";
import { Icon } from "@/components/icon";
import { MediaUploader } from "@/components/media-uploader";
import { PlatformPreview } from "@/components/platform-preview";
import { ManualPostRow, PublishButton } from "@/components/publish-controls";
import { StatusSteps } from "@/components/status-steps";
import { canEditContent } from "@/src/access/permissions";
import { CATALOG, publishMode } from "@/src/channels/catalog";
import { nextStatus, type ContentAction } from "@/src/content/state";
import { FORMAT_LABEL } from "@/src/i18n/th";
import { formatThai } from "@/src/lib/time";
import { loadDetail } from "@/src/server/content-page";
import { projectPage } from "@/src/server/context";

const STATE_TEXT = { pending: "รอเผยแพร่", posted: "โพสต์อัตโนมัติแล้ว", manual_todo: "ต้องโพสต์เอง", manual_done: "โพสต์เองแล้ว", failed: "โพสต์ไม่สำเร็จ" } as const;
const STATE_TONE = { pending: "neutral", posted: "ok", manual_todo: "bad", manual_done: "ok", failed: "bad" } as const;

export default async function ContentPage({ params }: { params: Promise<{ projectId: string; contentId: string }> }) {
  const { projectId, contentId } = await params;
  const ctx = await projectPage(projectId);
  const d = await loadDetail(ctx.user.id, contentId);
  if (d.content.projectId !== projectId) notFound();
  const c = d.content;
  const wt = ctx.workTypes.find((w) => w.id === c.workTypeId);
  const pillar = ctx.pillars.find((p) => p.id === c.pillarId);
  const editable = canEditContent(ctx.role, d.isOwner, c.status);
  const acts: ActionKey[] = [];
  if (editable) acts.push("edit");
  for (const a of ["start", "submit", "withdraw", "approve", "requestChanges", "schedule", "unschedule", "publish"] as ContentAction[])
    if (nextStatus(c.status, a, ctx.role, d.isOwner)) acts.push(a);
  const platforms = d.channels.map((x) => x.platform);
  const overrides = Object.fromEntries(d.channels.filter((x) => x.captionOverride).map((x) => [x.platform, x.captionOverride!]));
  const published = c.status === "published";

  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <Link href={`/p/${projectId}/library`} className="small muted" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="left" size="sm" />คลังคอนเทนต์</Link>
      </div>
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <StatusPill s={c.status} />
            <WorkTypeChip name={wt?.name} />
            <span className="small muted">{FORMAT_LABEL[c.format]}{pillar ? ` · ${pillar.name}` : ""}</span>
          </div>
          <h1>{c.title}</h1>
          <StatusSteps status={c.status} />
        </div>
        <div className="actions"><FavoriteButton projectId={projectId} contentId={c.id} on={d.favorite} /></div>
      </div>
      <ContentActions
        projectId={projectId}
        contentId={c.id}
        actions={acts}
        publishSlot={<PublishButton projectId={projectId} contentId={c.id} manualCount={d.channels.filter((x) => publishMode(ctx.channels.find((k) => k.platform === x.platform), c.format, wt).mode === "manual").length} />}
      />
      <div className="detail">
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <section className="card">
            <div className="card-head"><h2>ตัวอย่างโพสต์</h2><span className="sp small muted">ดูว่าแต่ละช่องทางจะออกมาหน้าตาแบบไหน</span></div>
            <PlatformPreview title={c.title} format={c.format} pillarColor={pillar?.color} caption={c.caption} overrides={overrides} platforms={platforms} media={d.media} account={ctx.project.name} />
          </section>
          <section className="card">
            <div className="card-head"><h2>รูปและวิดีโอ</h2><span className="pill t-neutral plain">{d.media.length}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Gallery projectId={projectId} contentId={c.id} items={d.media} editable={editable} title={c.title} format={c.format} />
              {editable && <MediaUploader contentId={c.id} />}
            </div>
          </section>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <section className="card">
            <dl className="meta">
              <dt>{published ? "เผยแพร่เมื่อ" : c.status === "scheduled" ? "ตั้งเวลาโพสต์" : "กำหนดลง"}</dt><dd>{formatThai(c.scheduledAt, "datetime")}</dd>
              <dt>ผู้รับผิดชอบ</dt><dd>{d.ownerName}</dd>
              <dt>ประเภทงาน</dt><dd>{wt?.name ?? "ไม่ระบุ"}{wt?.manualOnly && <span className="small muted">(ทำเองเสมอ)</span>}</dd>
              <dt>หมวด</dt><dd>{pillar?.name ?? "ไม่ระบุ"}</dd>
              <dt>ไฟล์งาน</dt><dd>{c.assetLink ? <a href={c.assetLink} target="_blank" rel="noopener">เปิดลิงก์ <Icon name="ext" size="sm" /></a> : <span className="muted">ไม่มี</span>}</dd>
            </dl>
          </section>
          <section className="card" id="channels">
            <div className="card-head"><h2>ช่องทาง & การโพสต์</h2></div>
            {d.channels.map((x) => {
              const mode = publishMode(ctx.channels.find((k) => k.platform === x.platform), c.format, wt);
              return (
                <div className="pub-row" key={x.id}>
                  <ChannelBadge p={x.platform} lg />
                  <div className="what">
                    <div className="line1"><b>{CATALOG[x.platform].name}</b>{x.captionOverride && <span className="wt-chip">แคปชันแยก</span>}</div>
                    <div className="line1">
                      {published ? (
                        <>
                          <span className={`pill t-${STATE_TONE[x.publishState]}`}>{STATE_TEXT[x.publishState]}</span>
                          {x.postUrl && <a className="small" href={x.postUrl} target="_blank" rel="noopener">เปิดโพสต์</a>}
                          {x.reason && x.publishState === "manual_todo" && <span className="small muted">{x.reason}</span>}
                        </>
                      ) : (
                        <>
                          <span className={`pill t-${mode.mode === "auto" ? "ok" : "bad"}`}>{mode.mode === "auto" ? "โพสต์อัตโนมัติ" : "ต้องโพสต์เอง"}</span>
                          <span className="small muted">{mode.reason}</span>
                        </>
                      )}
                    </div>
                    {published && x.publishState === "manual_todo" && ctx.can("manual") && (ctx.can("editAny") || d.isOwner) && (
                      <ManualPostRow projectId={projectId} ccId={x.id} caption={x.captionOverride || c.caption} platformName={CATALOG[x.platform].name} platformUrl={CATALOG[x.platform].url} files={d.media.map((m, i) => ({ href: `/files/${m.storageKey}`, label: `ไฟล์ ${i + 1}` }))} />
                    )}
                  </div>
                </div>
              );
            })}
          </section>
          <section className="card" id="comments">
            <div className="card-head"><h2>ความคิดเห็น</h2><span className="pill t-neutral plain">{d.comments.length}</span></div>
            {d.comments.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {d.comments.map((m) => (
                  <div className="comment" key={m.id}>
                    <span className="av" style={{ background: "var(--accent)" }}>{m.userName.slice(0, 1)}</span>
                    <div className="bubble"><div className="small"><b>{m.userName}</b> <span className="faint">{formatThai(m.createdAt, "datetime")}</span></div>{m.body}</div>
                  </div>
                ))}
              </div>
            ) : <p className="small muted">ยังไม่มีความคิดเห็น</p>}
          </section>
          <section className="card">
            <div className="card-head"><h2>ประวัติการแก้ไข</h2></div>
            {d.versions.slice(0, 10).map((v) => (
              <div className="version-row" key={v.id}>
                <Icon name="history" size="sm" />
                <span style={{ flex: 1 }}>ฉบับที่ {v.version} · {v.userName}</span>
                <span className="faint">{formatThai(v.createdAt, "datetime")}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
