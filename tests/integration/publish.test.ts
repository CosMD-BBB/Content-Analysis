import { eq } from "drizzle-orm";
import { beforeEach, expect, test } from "vitest";
import { applyAction, createContent, updateContent } from "@/src/content/service";
import type { ContentInput } from "@/src/content/validation";
import { channels, contentChannels, contents } from "@/src/db/schema";
import { getProjectContext } from "@/src/projects/service";
import { confirmManualPost, publishDue, publishNow, runChannelPublish, type PublishAdapter } from "@/src/publish/service";
import { mkProject } from "../factories";
import { resetDb, testDb } from "../helpers";

const db = testDb();
beforeEach(() => resetDb(db));

async function setup(over: Partial<ContentInput> = {}) {
  const f = await mkProject(db);
  const ctx = await getProjectContext(db, f.owner.id, f.project.id);
  const input = (o: Partial<ContentInput> = {}): ContentInput => ({
    title: "t", workTypeId: ctx.workTypes.find((w) => w.name === "โพสต์ทั่วไป")!.id, format: "image", pillarId: null,
    date: "2030-01-01", time: "10:00", ownerId: f.creator.id, platforms: ["facebook", "lemon8"], ...over, ...o,
  });
  const c = await createContent(db, f.creator.id, f.project.id, input());
  const approve = async () => { await applyAction(db, f.creator.id, c.id, "submit"); await applyAction(db, f.manager.id, c.id, "approve"); };
  return { ...f, ctx, c, input, approve };
}
const ccOf = (contentId: string) => db.select().from(contentChannels).where(eq(contentChannels.contentId, contentId));

test("publishNow on draft content → invalid, nothing changes", async () => {
  const s = await setup();
  expect(await publishNow(db, s.manager.id, s.c.id)).toEqual({ ok: false, error: "invalid_action" });
  expect((await ccOf(s.c.id)).every((x) => x.publishState === "pending")).toBe(true);
});

test("creator cannot publish even when approved", async () => {
  const s = await setup();
  await s.approve();
  expect(await publishNow(db, s.creator.id, s.c.id)).toEqual({ ok: false, error: "invalid_action" });
});

test("phase 1: every channel becomes manual_todo with a reason", async () => {
  const s = await setup();
  await s.approve();
  const r = await publishNow(db, s.manager.id, s.c.id);
  expect(r).toEqual({ ok: true, auto: [], manual: 2 });
  const cc = await ccOf(s.c.id);
  expect(cc.find((x) => x.platform === "lemon8")!.reason).toBe("แพลตฟอร์มไม่มี API สำหรับโพสต์");
  expect(cc.find((x) => x.platform === "facebook")!.reason).toBe("ยังไม่ได้เชื่อมต่อบัญชี");
});

test("Ads work type stays manual even on a connected channel with an adapter", async () => {
  const s = await setup();
  await db.update(channels).set({ status: "connected" }).where(eq(channels.projectId, s.project.id));
  const ads = s.ctx.workTypes.find((w) => w.name === "Ads")!;
  const c = await createContent(db, s.creator.id, s.project.id, s.input({ workTypeId: ads.id, platforms: ["facebook"] }));
  await applyAction(db, s.creator.id, c.id, "submit"); await applyAction(db, s.manager.id, c.id, "approve");
  const fake: PublishAdapter = { publish: async () => ({ url: "https://fb.com/1" }) };
  expect(await publishNow(db, s.manager.id, c.id, { facebook: fake })).toEqual({ ok: true, auto: [], manual: 1 });
  expect((await ccOf(c.id))[0].reason).toBe("งานประเภทนี้ต้องทำในระบบของแพลตฟอร์มเอง");
});

test("publishDue publishes only scheduled items that are due", async () => {
  const s = await setup({ date: new Date(Date.now() + 864e5).toISOString().slice(0, 10) });
  await s.approve();
  expect((await applyAction(db, s.manager.id, s.c.id, "schedule")).ok).toBe(true);
  expect((await publishDue(db, new Date())).published).toEqual([]);
  expect((await publishDue(db, new Date(Date.now() + 3 * 864e5))).published).toEqual([s.c.id]);
  const [c] = await db.select().from(contents).where(eq(contents.id, s.c.id));
  expect(c.status).toBe("published");
});

test("content edited after scheduling is not published by the scan", async () => {
  const s = await setup({ date: new Date(Date.now() + 864e5).toISOString().slice(0, 10) });
  await s.approve();
  await applyAction(db, s.manager.id, s.c.id, "schedule");
  const [cur] = await db.select().from(contents).where(eq(contents.id, s.c.id));
  await updateContent(db, s.manager.id, s.c.id, s.input({ title: "แก้", date: new Date(Date.now() + 864e5).toISOString().slice(0, 10) }), cur.version);
  expect((await publishDue(db, new Date(Date.now() + 3 * 864e5))).published).toEqual([]);
});

test("adapter failing 3 times → manual_todo with reason; success → posted", async () => {
  const s = await setup();
  await db.update(channels).set({ status: "connected" }).where(eq(channels.projectId, s.project.id));
  await s.approve();
  const bad: PublishAdapter = { publish: async () => { throw new Error("token หมดอายุ"); } };
  const r = await publishNow(db, s.manager.id, s.c.id, { facebook: bad });
  if (!r.ok) throw new Error();
  expect(r.auto).toHaveLength(1);
  await expect(runChannelPublish(db, r.auto[0], 1, { facebook: bad })).rejects.toThrow();
  await expect(runChannelPublish(db, r.auto[0], 2, { facebook: bad })).rejects.toThrow();
  expect(await runChannelPublish(db, r.auto[0], 3, { facebook: bad })).toBe("manual_todo");
  const fb = (await ccOf(s.c.id)).find((x) => x.platform === "facebook")!;
  expect(fb.reason).toContain("token หมดอายุ");

  const s2 = await setup();
  await db.update(channels).set({ status: "connected" }).where(eq(channels.projectId, s2.project.id));
  await s2.approve();
  const good: PublishAdapter = { publish: async () => ({ url: "https://fb.com/p/1" }) };
  const r2 = await publishNow(db, s2.manager.id, s2.c.id, { facebook: good });
  if (!r2.ok) throw new Error();
  expect(await runChannelPublish(db, r2.auto[0], 1, { facebook: good })).toBe("posted");
});

test("confirmManualPost: https only, creator only own content", async () => {
  const s = await setup();
  await s.approve();
  await publishNow(db, s.manager.id, s.c.id);
  const lemon = (await ccOf(s.c.id)).find((x) => x.platform === "lemon8")!;
  expect(await confirmManualPost(db, s.creator.id, lemon.id, "http://x.com/a")).toEqual({ ok: false, error: "invalid_url" });
  expect(await confirmManualPost(db, s.creator.id, lemon.id, "javascript:alert(1)")).toEqual({ ok: false, error: "invalid_url" });
  await expect(confirmManualPost(db, s.creator2.id, lemon.id, "https://lemon8.com/p/1")).rejects.toThrow("forbidden");
  await expect(confirmManualPost(db, s.analyst.id, lemon.id, "https://lemon8.com/p/1")).rejects.toThrow("forbidden");
  expect(await confirmManualPost(db, s.creator.id, lemon.id, "https://lemon8.com/p/1")).toEqual({ ok: true });
});
