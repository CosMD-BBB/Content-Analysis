import { ContentForm } from "@/components/content-form";
import { PageHead } from "@/components/page-head";
import { addDaysKey, bangkokDayKey } from "@/src/lib/time";
import { ownerOptions } from "@/src/server/content-page";
import { projectPage } from "@/src/server/context";

export default async function NewContentPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ date?: string }> }) {
  const { projectId } = await params;
  const { date } = await searchParams;
  const ctx = await projectPage(projectId);
  if (!ctx.can("create")) return <div className="banner">บทบาทของคุณสร้างคอนเทนต์ไม่ได้</div>;
  const owners = await ownerOptions(ctx.user.id, projectId);
  return (
    <>
      <PageHead eyebrow="คอนเทนต์ใหม่" title="สร้างคอนเทนต์" sub="บันทึกแล้วเพิ่มรูปหรือวิดีโอได้ในหน้าถัดไป" />
      <ContentForm
        projectId={projectId}
        workTypes={ctx.workTypes}
        pillars={ctx.pillars}
        owners={owners.length ? owners : [{ id: ctx.user.id, name: ctx.user.name }]}
        channels={ctx.channels}
        canAssign={ctx.can("assign")}
        initial={{
          title: "", workTypeId: ctx.workTypes[0]?.id ?? null, format: "reel", pillarId: null,
          date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : addDaysKey(bangkokDayKey(new Date()), 1), time: "19:00",
          ownerId: ctx.user.id, platforms: ["facebook", "instagram", "tiktok"], caption: "", captionOverrides: {}, assetLink: "",
        }}
      />
    </>
  );
}
