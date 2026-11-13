import { PageHead } from "@/components/page-head";
import { projectPage } from "@/src/server/context";

export default async function OverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await projectPage(projectId);
  return <PageHead eyebrow={ctx.project.name} title={`สวัสดี, ${ctx.user.name}`} />;
}
