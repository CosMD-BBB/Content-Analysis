import { and, count, eq, inArray } from "drizzle-orm";
import { Bell } from "@/components/bell";
import { Shell } from "@/components/shell";
import { listNotifications } from "@/src/notify/service";
import { formatThai } from "@/src/lib/time";
import { getDb } from "@/src/db/client";
import { contentChannels, contents } from "@/src/db/schema";
import { listMyProjects } from "@/src/projects/service";
import { projectPage } from "@/src/server/context";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await projectPage(projectId);
  const db = getDb();
  const [projects, [{ n: pending }], [{ n: manual }], notes] = await Promise.all([
    listMyProjects(db, ctx.user.id),
    db.select({ n: count() }).from(contents).where(and(eq(contents.projectId, projectId), eq(contents.status, "review"))),
    db.select({ n: count() }).from(contentChannels).innerJoin(contents, eq(contents.id, contentChannels.contentId))
      .where(and(eq(contents.projectId, projectId), inArray(contentChannels.publishState, ["manual_todo"]))),
    listNotifications(db, ctx.user.id),
  ]);
  const b = `/p/${projectId}`;
  return (
    <Shell
      user={ctx.user}
      role={ctx.role}
      project={ctx.project}
      projects={projects.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
      canCreate={ctx.can("create")}
      bell={<Bell unread={notes.unread} items={notes.items.map((n) => ({ id: n.id, text: n.text, title: n.title, projectId: n.projectId, contentId: n.contentId, when: formatThai(n.createdAt, "datetime"), read: !!n.readAt }))} />}
      nav={[
        { href: b, label: "ภาพรวม", icon: "home" },
        { href: `${b}/calendar`, label: "ปฏิทินคอนเทนต์", icon: "calendar" },
        { href: `${b}/library`, label: "คลังคอนเทนต์", icon: "layers" },
        { href: `${b}/approvals`, label: "อนุมัติ & เผยแพร่", icon: "approve", count: pending + manual },
        { href: `${b}/reports`, label: "รายงานผล", icon: "chart" },
        { href: `${b}/favorites`, label: "รายการโปรด", icon: "star" },
      ]}
      settingsNav={[
        { href: `${b}/channels`, label: "ช่องทางที่เชื่อมต่อ", icon: "link" },
        { href: `${b}/team`, label: "ทีมและสิทธิ์", icon: "users" },
        { href: `${b}/settings`, label: "ตั้งค่าโปรเจกต์", icon: "settings" },
      ]}
    >
      {children}
    </Shell>
  );
}
