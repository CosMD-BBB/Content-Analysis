import { Icon } from "@/components/icon";
import { PageHead } from "@/components/page-head";
import { AddMember, InviteLink, RemoveMember, ResetPassword, RoleSelect } from "@/components/team-forms";
import { PERMS } from "@/src/access/permissions";
import { getDb } from "@/src/db/client";
import { ROLES } from "@/src/db/schema";
import { ROLE_DESC, ROLE_LABEL } from "@/src/i18n/th";
import { listMembers } from "@/src/projects/service";
import { projectPage } from "@/src/server/context";

export default async function TeamPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await projectPage(projectId);
  const members = await listMembers(getDb(), ctx.user.id, projectId);
  const admin = ctx.can("team");
  return (
    <>
      <PageHead eyebrow="สิทธิ์การใช้งาน" title="ทีมและสิทธิ์" sub="สมาชิกของโปรเจกต์นี้ แต่ละบทบาทเห็นเมนูและปุ่มไม่เหมือนกัน" />
      {admin && (
        <div className="cols">
          <section className="card"><div className="card-head"><h2>เพิ่มคนที่สมัครแล้ว</h2></div><AddMember projectId={projectId} /></section>
          <section className="card"><div className="card-head"><h2>เชิญคนที่ยังไม่สมัคร</h2></div><InviteLink projectId={projectId} /></section>
        </div>
      )}
      <section className="card" style={{ padding: "6px 8px" }}>
        <div className="scroll-x">
          <table className="tbl" style={{ minWidth: 560 }}>
            <thead><tr><th>สมาชิก</th><th>อีเมล</th><th>บทบาท</th>{admin && <th />}</tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId} style={{ cursor: "default" }}>
                  <td><b>{m.name}</b>{m.userId === ctx.user.id && <span className="pill t-accent plain" style={{ marginLeft: 8 }}>คุณ</span>}</td>
                  <td className="muted">{m.email}</td>
                  <td>{admin ? <RoleSelect projectId={projectId} userId={m.userId} role={m.role} /> : <span className="pill t-neutral plain">{ROLE_LABEL[m.role]}</span>}</td>
                  {admin && <td className="r"><span className="row" style={{ justifyContent: "flex-end", gap: 4, flexWrap: "nowrap" }}>{m.userId !== ctx.user.id && ctx.user.isSuperAdmin && <ResetPassword userId={m.userId} name={m.name} />}{m.userId !== ctx.user.id && <RemoveMember projectId={projectId} userId={m.userId} name={m.name} />}</span></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card" style={{ padding: "6px 8px" }}>
        <div className="card-head" style={{ padding: "10px 10px 0" }}><h2>สิทธิ์ของแต่ละบทบาท</h2></div>
        <div className="scroll-x">
          <table className="tbl" style={{ minWidth: 620 }}>
            <thead><tr><th>สิ่งที่ทำได้</th>{ROLES.map((r) => <th key={r} className="r" style={r === ctx.role ? { color: "var(--accent)" } : undefined} title={ROLE_DESC[r]}>{ROLE_LABEL[r]}</th>)}</tr></thead>
            <tbody>
              {PERMS.map((p) => (
                <tr key={p.perm} style={{ cursor: "default" }}>
                  <td>{p.label}</td>
                  {ROLES.map((r) => <td key={r} className="r">{p.roles.includes(r) ? <span style={{ color: "var(--ok)" }}><Icon name="check" size="sm" /></span> : <span className="faint">–</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
