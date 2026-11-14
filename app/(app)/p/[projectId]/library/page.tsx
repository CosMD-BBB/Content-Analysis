import { Suspense } from "react";
import { ContentTable } from "@/components/content-table";
import { FilterBar } from "@/components/filter-bar";
import { PageHead } from "@/components/page-head";
import { CATALOG } from "@/src/channels/catalog";
import { listContents } from "@/src/content/service";
import { getDb } from "@/src/db/client";
import { CONTENT_STATUSES, PLATFORMS } from "@/src/db/constants";
import { STATUS_LABEL } from "@/src/i18n/th";
import { viewsByContent } from "@/src/reports/aggregate";
import { projectPage } from "@/src/server/context";
import { readFilters, type SP } from "@/src/server/filters";
import { ownerOptions } from "@/src/server/content-page";

export default async function LibraryPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<SP> }) {
  const { projectId } = await params;
  const ctx = await projectPage(projectId);
  const rows = await listContents(getDb(), ctx.user.id, projectId, readFilters(await searchParams));
  const owners = await ownerOptions(ctx.user.id, projectId);
  const views = await viewsByContent(getDb(), rows.filter((r) => r.status === "published").map((r) => r.id));
  return (
    <>
      <PageHead eyebrow="ทุกชิ้นงาน" title="คลังคอนเทนต์" sub="ค้นหา กรอง และกดดาวเก็บงานที่อยากกลับมาดูเป็นรายการโปรด" />
      <Suspense>
        <FilterBar
          search
          selects={[
            { name: "status", label: "ทุกสถานะ", options: CONTENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
            { name: "workType", label: "ทุกประเภทงาน", options: ctx.workTypes.map((w) => ({ value: w.id, label: w.name })) },
            { name: "platform", label: "ทุกช่องทาง", options: PLATFORMS.map((p) => ({ value: p, label: CATALOG[p].name })) },
            { name: "owner", label: "ทุกคน", options: owners.map((o) => ({ value: o.id, label: o.name })) },
          ]}
        />
      </Suspense>
      <section className="card" style={{ padding: "6px 8px" }}>
        <ContentTable projectId={projectId} rows={rows} workTypes={ctx.workTypes} pillars={ctx.pillars} views={views} empty="ไม่พบคอนเทนต์ที่ตรงกับตัวกรอง" />
      </section>
    </>
  );
}
