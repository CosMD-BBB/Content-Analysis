/**
 * Worker: รันแยกจากเว็บ (`npm run worker`)
 * - ทุก 1 นาที: โพสต์งานที่ตั้งเวลาไว้และถึงเวลาแล้ว
 * - โพสต์แต่ละช่องทางผ่าน API (ลองใหม่สูงสุด 3 ครั้ง)
 * - ทุกวัน 09:00 เวลาไทย: เตือนงานที่ใกล้กำหนดแต่ยังไม่ส่ง
 */
import { PgBoss } from "pg-boss";
import { createDb } from "../db/client";
import { notifyDueSoon, notifyPublished } from "../notify/service";
import { publishDue, runChannelPublish } from "../publish/service";
import { ensureQueues, Q } from "./queue";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = createDb(url);
  const boss = new PgBoss(url);
  boss.on("error", (e) => console.error("[pg-boss]", e));
  await boss.start();
  await ensureQueues(boss);
  await boss.schedule(Q.scan, "* * * * *", null, { tz: "Asia/Bangkok" });
  await boss.schedule(Q.dueSoon, "0 9 * * *", null, { tz: "Asia/Bangkok" });

  await boss.work(Q.scan, async () => {
    const r = await publishDue(db);
    for (const id of r.published) await notifyPublished(db, id);
    for (const id of r.auto) await boss.send(Q.publish, { id });
    if (r.published.length) console.log(`[scan] published ${r.published.length}`);
  });
  await boss.work<{ id: string }>(Q.publish, async ([job]) => {
    const state = await runChannelPublish(db, job.data.id, job.retryCount + 1);
    console.log(`[publish] ${job.data.id} → ${state}`);
  });
  await boss.work(Q.dueSoon, async () => {
    const n = await notifyDueSoon(db);
    console.log(`[due-soon] notified ${n}`);
  });
  console.log("worker started");
  const stop = async () => { await boss.stop(); process.exit(0); };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((e) => { console.error(e); process.exit(1); });
