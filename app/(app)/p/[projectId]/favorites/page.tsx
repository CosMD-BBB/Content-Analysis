import { ContentTable } from "@/components/content-table";
import { PageHead } from "@/components/page-head";
import { listContents } from "@/src/content/service";
import { getDb } from "@/src/db/client";
import { projectPage } from "@/src/server/context";

export default async function FavoritesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await projectPage(projectId);
  const rows = await listContents(getDb(), ctx.user.id, projectId, { favoritesOf: ctx.user.id });
  return (
    <>
      <PageHead eyebrow="เก็บไว้ดูภายหลัง" title="รายการโปรด" sub="กดดาวที่คอนเทนต์ใดก็ได้เพื่อเก็บไว้ที่นี่ รายการโปรดแยกตามผู้ใช้แต่ละคน" />
      <section className="card" style={{ padding: "6px 8px" }}>
        <ContentTable projectId={projectId} rows={rows} workTypes={ctx.workTypes} pillars={ctx.pillars} empty="ยังไม่มีรายการโปรด กดดาวในคลังคอนเทนต์หรือรายงานผลเพื่อเพิ่ม" />
      </section>
    </>
  );
}
