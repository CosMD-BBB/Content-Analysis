import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Icon } from "@/components/icon";
import { Submit } from "@/components/submit";
import { requireUser } from "@/src/auth/session";
import { getDb } from "@/src/db/client";
import { ROLE_LABEL } from "@/src/i18n/th";
import { listMyProjects } from "@/src/projects/service";
import { createProjectAction } from "./actions";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await listMyProjects(getDb(), user.id);
  if (!projects.length && !user.isSuperAdmin) redirect("/waiting");
  return (
    <div className="login" style={{ placeItems: "start center" }}>
      <div className="login-box" style={{ width: "min(1000px, 100%)" }}>
        <div className="page-head">
          <div>
            <div className="eyebrow">Content Studio</div>
            <h1>ทุกโปรเจกต์</h1>
            <p className="muted">สรุปงานรออนุมัติและงานที่ต้องโพสต์เองของทุกบริษัทที่คุณดูแล</p>
          </div>
        </div>
        {projects.length ? (
          <div className="pcards">
            {projects.map((p) => (
              <Link key={p.id} href={`/p/${p.id}`} className="card pcard">
                <div className="row" style={{ gap: 10 }}>
                  <span className="brand-mark" style={{ background: p.color }}>{p.name.slice(0, 1).toUpperCase()}</span>
                  <div><h2>{p.name}</h2><div className="small muted">{ROLE_LABEL[p.role]}</div></div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className={`pill ${p.pendingApprovals ? "t-warn" : "t-neutral"}`}>รออนุมัติ {p.pendingApprovals}</span>
                  <span className={`pill ${p.manualTodo ? "t-bad" : "t-neutral"}`}>ต้องโพสต์เอง {p.manualTodo}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card empty">ยังไม่มีโปรเจกต์ สร้างโปรเจกต์แรกสำหรับบริษัทที่ดูแลได้เลย</div>
        )}
        {user.isSuperAdmin && (
          <section className="card">
            <div className="card-head"><h2>สร้างโปรเจกต์ใหม่</h2><span className="sp small muted">1 โปรเจกต์ = 1 บริษัทหรือแบรนด์</span></div>
            <ActionForm action={createProjectAction} className="inline-form">
              <input className="input" name="name" placeholder="ชื่อบริษัท / แบรนด์" required aria-label="ชื่อโปรเจกต์" />
              <input type="color" name="color" defaultValue="#3E4FE0" aria-label="สีประจำโปรเจกต์" style={{ width: 44, height: 38, border: 0, background: "none" }} />
              <Submit><Icon name="plus" size="sm" />สร้างโปรเจกต์</Submit>
            </ActionForm>
          </section>
        )}
      </div>
    </div>
  );
}
