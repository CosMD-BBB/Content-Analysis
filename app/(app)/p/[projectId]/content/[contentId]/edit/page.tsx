import { notFound } from "next/navigation";
import { ContentForm } from "@/components/content-form";
import { PageHead } from "@/components/page-head";
import { canEditContent } from "@/src/access/permissions";
import { bangkokDayKey, bangkokTime } from "@/src/lib/time";
import { loadDetail, ownerOptions } from "@/src/server/content-page";
import { projectPage } from "@/src/server/context";

export default async function EditContentPage({ params }: { params: Promise<{ projectId: string; contentId: string }> }) {
  const { projectId, contentId } = await params;
  const ctx = await projectPage(projectId);
  const d = await loadDetail(ctx.user.id, contentId);
  if (d.content.projectId !== projectId) notFound();
  const c = d.content;
  if (!canEditContent(ctx.role, d.isOwner, c.status)) return <div className="banner">คุณแก้งานนี้ในสถานะปัจจุบันไม่ได้</div>;
  const owners = await ownerOptions(ctx.user.id, projectId);
  const overrides = Object.fromEntries(d.channels.filter((x) => x.captionOverride).map((x) => [x.platform, x.captionOverride!]));
  return (
    <>
      <PageHead eyebrow="แก้ไขคอนเทนต์" title={c.title} />
      <ContentForm
        projectId={projectId}
        workTypes={ctx.workTypes}
        pillars={ctx.pillars}
        owners={owners}
        channels={ctx.channels}
        canAssign={ctx.can("assign")}
        statusNote={c.status === "approved" || c.status === "scheduled" ? "งานนี้อนุมัติแล้ว ถ้าบันทึกการแก้ไข งานจะกลับไปรออนุมัติใหม่" : undefined}
        initial={{
          contentId: c.id, version: c.version, title: c.title, workTypeId: c.workTypeId, format: c.format, pillarId: c.pillarId,
          date: bangkokDayKey(c.scheduledAt), time: bangkokTime(c.scheduledAt), ownerId: c.ownerId,
          platforms: d.channels.map((x) => x.platform), caption: c.caption, captionOverrides: overrides, assetLink: c.assetLink,
        }}
      />
    </>
  );
}
