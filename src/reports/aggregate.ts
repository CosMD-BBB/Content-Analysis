import { desc, eq, inArray } from "drizzle-orm";
import type { DB } from "../db/client";
import { contentChannels, metrics } from "../db/schema";

/** ยอดวิวรวมล่าสุดของแต่ละคอนเทนต์ (ใช้ตัวเลขวันล่าสุดของแต่ละช่องทาง) */
export async function viewsByContent(db: DB, contentIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!contentIds.length) return out;
  const rows = await db
    .selectDistinctOn([metrics.contentChannelId], { views: metrics.views, contentId: contentChannels.contentId })
    .from(metrics)
    .innerJoin(contentChannels, eq(contentChannels.id, metrics.contentChannelId))
    .where(inArray(contentChannels.contentId, contentIds))
    .orderBy(metrics.contentChannelId, desc(metrics.day));
  for (const r of rows) out.set(r.contentId, (out.get(r.contentId) ?? 0) + (r.views ?? 0));
  return out;
}
