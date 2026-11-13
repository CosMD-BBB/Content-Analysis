import { eq } from "drizzle-orm";
import { beforeEach, expect, test } from "vitest";
import { applyAction, createContent } from "@/src/content/service";
import { contentChannels } from "@/src/db/schema";
import { confirmManualPost, publishNow } from "@/src/publish/service";
import { enterMetrics, loadReportRows, viewsByContent } from "@/src/reports/aggregate";
import { mkProject } from "../factories";
import { resetDb, testDb } from "../helpers";

const db = testDb();
beforeEach(() => resetDb(db));

async function published() {
  const f = await mkProject(db);
  const c = await createContent(db, f.creator.id, f.project.id, { title: "t", workTypeId: null, format: "image", pillarId: null, date: "2030-01-01", time: "10:00", ownerId: f.creator.id, platforms: ["lemon8", "facebook"] });
  await applyAction(db, f.creator.id, c.id, "submit"); await applyAction(db, f.manager.id, c.id, "approve");
  await publishNow(db, f.manager.id, c.id);
  const ccs = await db.select().from(contentChannels).where(eq(contentChannels.contentId, c.id));
  for (const cc of ccs) await confirmManualPost(db, f.manager.id, cc.id, `https://example.com/${cc.platform}`);
  return { ...f, c, lemon: ccs.find((x) => x.platform === "lemon8")! };
}

test("analyst can enter metrics, creator cannot; negative is rejected", async () => {
  const s = await published();
  await expect(enterMetrics(db, s.creator.id, s.lemon.id, { views: 10 })).rejects.toThrow("forbidden");
  await expect(enterMetrics(db, s.analyst.id, s.lemon.id, { views: -1 })).rejects.toThrow("validation");
  await enterMetrics(db, s.analyst.id, s.lemon.id, { views: 1200, likes: 80, comments: 5, shares: 3 });
  await enterMetrics(db, s.analyst.id, s.lemon.id, { views: 1500, likes: 90, comments: 5, shares: 3 });
  const rows = await loadReportRows(db, s.manager.id, s.project.id);
  const l = rows.find((r) => r.platform === "lemon8")!;
  expect([l.views, l.source]).toEqual([1500, "manual"]);
  expect(rows.find((r) => r.platform === "facebook")!.source).toBeNull();
  expect((await viewsByContent(db, [s.c.id])).get(s.c.id)).toBe(1500);
});

test("channels not yet posted are left out of reports", async () => {
  const f = await mkProject(db);
  const c = await createContent(db, f.creator.id, f.project.id, { title: "t", workTypeId: null, format: "image", pillarId: null, date: "2030-01-01", time: "10:00", ownerId: f.creator.id, platforms: ["x"] });
  await applyAction(db, f.creator.id, c.id, "submit"); await applyAction(db, f.manager.id, c.id, "approve");
  await publishNow(db, f.manager.id, c.id);
  expect(await loadReportRows(db, f.manager.id, f.project.id)).toEqual([]);
});
