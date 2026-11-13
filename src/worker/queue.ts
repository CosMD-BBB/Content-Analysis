import { PgBoss } from "pg-boss";

export const Q = { scan: "scan-scheduled", publish: "publish-channel", dueSoon: "due-soon" } as const;

let boss: PgBoss | undefined;
let starting: Promise<PgBoss> | undefined;

/** pg-boss สำหรับส่งงานเข้าคิวจากเว็บ (worker แยก process เป็นคนทำงาน) */
export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  starting ??= (async () => {
    const b = new PgBoss(process.env.DATABASE_URL!);
    b.on("error", (e) => console.error("[pg-boss]", e));
    await b.start();
    await ensureQueues(b);
    boss = b;
    return b;
  })();
  return starting;
}

export async function ensureQueues(b: PgBoss) {
  for (const [name, opts] of [
    [Q.scan, {}],
    [Q.publish, { retryLimit: 2, retryDelay: 60, retryBackoff: true }],
    [Q.dueSoon, {}],
  ] as const) {
    if (!(await b.getQueue(name))) await b.createQueue(name, opts);
  }
}

export async function enqueueChannelPublishes(ids: string[]) {
  if (!ids.length) return;
  const b = await getBoss();
  for (const id of ids) await b.send(Q.publish, { id });
}
