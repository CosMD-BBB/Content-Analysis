import { ActionForm } from "@/components/action-form";
import { ListEditor } from "@/components/list-editor";
import { PageHead } from "@/components/page-head";
import { Submit } from "@/components/submit";
import { projectPage } from "@/src/server/context";
import { archiveAction, pillarsAction, renameAction, workTypesAction } from "./actions";

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await projectPage(projectId);
  if (!ctx.can("team"))
    return (
      <>
        <PageHead eyebrow="โปรเจกต์" title="ตั้งค่าโปรเจกต์" />
        <div className="banner">การตั้งค่าโปรเจกต์ทำได้เฉพาะผู้ดูแลโปรเจกต์</div>
      </>
    );
  return (
    <>
      <PageHead eyebrow="โปรเจกต์" title="ตั้งค่าโปรเจกต์" sub="ชื่อ สีประจำโปรเจกต์ ประเภทงาน และหมวดคอนเทนต์ ใช้เฉพาะในโปรเจกต์นี้" />
      <section className="card">
        <div className="card-head"><h2>ชื่อโปรเจกต์</h2></div>
        <ActionForm action={renameAction} className="inline-form">
          <input type="hidden" name="projectId" value={projectId} />
          <input className="input" name="name" defaultValue={ctx.project.name} required aria-label="ชื่อโปรเจกต์" />
          <input type="color" name="color" defaultValue={ctx.project.color} aria-label="สี" style={{ width: 44, height: 38, border: 0, background: "none" }} />
          <Submit>บันทึก</Submit>
        </ActionForm>
      </section>
      <div className="cols">
        <section className="card">
          <div className="card-head"><h2>ประเภทงาน</h2><span className="sp small muted">ใช้กรองในปฏิทินและแยกผลในรายงาน</span></div>
          <ListEditor projectId={projectId} mode="workType" action={workTypesAction} initial={ctx.workTypes.map((w) => ({ id: w.id, name: w.name, manualOnly: w.manualOnly }))} />
        </section>
        <section className="card">
          <div className="card-head"><h2>หมวดคอนเทนต์</h2><span className="sp small muted">สีของหมวดใช้เป็นสีปกงานที่ยังไม่มีรูป</span></div>
          <ListEditor projectId={projectId} mode="pillar" action={pillarsAction} initial={ctx.pillars.map((p) => ({ id: p.id, name: p.name, color: p.color }))} />
        </section>
      </div>
      {ctx.user.isSuperAdmin && (
        <section className="card">
          <div className="card-head"><h2>ปิดโปรเจกต์</h2></div>
          <p className="small muted" style={{ marginBottom: 10 }}>โปรเจกต์ที่ปิดจะหายจากตัวสลับโปรเจกต์ ข้อมูลยังเก็บไว้ พิมพ์ “ปิดโปรเจกต์” เพื่อยืนยัน</p>
          <ActionForm action={archiveAction} className="inline-form">
            <input type="hidden" name="projectId" value={projectId} />
            <input className="input" name="confirm" placeholder="ปิดโปรเจกต์" aria-label="พิมพ์เพื่อยืนยัน" />
            <Submit className="btn bad">ปิดโปรเจกต์นี้</Submit>
          </ActionForm>
        </section>
      )}
    </>
  );
}
