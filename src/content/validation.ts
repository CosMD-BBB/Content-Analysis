import { z } from "zod";
import { FORMATS, PLATFORMS, type Platform } from "../db/constants";

export const contentInput = z.object({
  title: z.string().trim().min(1).max(200),
  workTypeId: z.string().uuid().nullable(),
  format: z.enum(FORMATS),
  pillarId: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  ownerId: z.string().uuid(),
  platforms: z.array(z.enum(PLATFORMS)).min(1),
  caption: z.string().max(10000).default(""),
  captionOverrides: z.partialRecord(z.enum(PLATFORMS), z.string().max(10000)).default({}),
  assetLink: z.union([z.literal(""), z.string().url()]).default(""),
});
export type ContentInput = z.input<typeof contentInput>;

const LIMITS: Partial<Record<Platform, { chars?: number; hashtags?: number; name: string }>> = {
  x: { chars: 280, name: "X" },
  instagram: { chars: 2200, hashtags: 30, name: "Instagram" },
  tiktok: { chars: 2200, name: "TikTok" },
};

/** ข้อความเตือนเรื่องความยาวแคปชันของแต่ละช่องทาง */
export function captionWarnings(caption: string, overrides: Partial<Record<Platform, string>>, platforms: Platform[]): string[] {
  const out: string[] = [];
  for (const p of platforms) {
    const lim = LIMITS[p];
    if (!lim) continue;
    const text = overrides[p]?.trim() ? overrides[p]! : caption;
    const len = [...text].length;
    if (lim.chars && len > lim.chars) out.push(`${lim.name}: เกิน ${lim.chars.toLocaleString()} ตัวอักษร (${len.toLocaleString()})`);
    const tags = (text.match(/#[^\s#]+/g) ?? []).length;
    if (lim.hashtags && tags > lim.hashtags) out.push(`${lim.name}: แฮชแท็กเกิน ${lim.hashtags} อัน (${tags})`);
  }
  return out;
}
