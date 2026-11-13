import { currentUser } from "@/src/auth/session";
import { CATALOG } from "@/src/channels/catalog";
import { getDb } from "@/src/db/client";
import { getProjectContext } from "@/src/projects/service";
import { loadReportRows, toCsv } from "@/src/reports/aggregate";
import { formatThai } from "@/src/lib/time";

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { projectId } = await params;
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days") ?? 30)));
  try {
    const ctx = await getProjectContext(getDb(), user.id, projectId);
    const from = new Date(Date.now() - days * 864e5);
    const rows = (await loadReportRows(getDb(), user.id, projectId)).filter((r) => r.publishedAt >= from).map((r) => ({
      ...r, published: formatThai(r.publishedAt, "datetime"), channel: CATALOG[r.platform].name,
      workType: ctx.workTypes.find((w) => w.id === r.workTypeId)?.name ?? "", pillar: ctx.pillars.find((p) => p.id === r.pillarId)?.name ?? "",
      sourceText: r.source === "api" ? "API" : r.source === "manual" ? "กรอกเอง" : "ยังไม่มีตัวเลข",
    }));
    const csv = toCsv(rows, [
      { key: "published", label: "วันเผยแพร่" }, { key: "title", label: "คอนเทนต์" }, { key: "channel", label: "ช่องทาง" }, { key: "workType", label: "ประเภทงาน" },
      { key: "pillar", label: "หมวด" }, { key: "ownerName", label: "ผู้รับผิดชอบ" }, { key: "views", label: "ยอดวิว" }, { key: "likes", label: "ไลก์" },
      { key: "comments", label: "คอมเมนต์" }, { key: "shares", label: "แชร์" }, { key: "clicks", label: "คลิก" }, { key: "sourceText", label: "ที่มาของตัวเลข" },
    ]);
    const name = `${ctx.project.name}-report-${days}d.csv`;
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="report-${days}d.csv"; filename*=UTF-8''${encodeURIComponent(name)}` } });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
}
