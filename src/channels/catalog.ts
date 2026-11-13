import type { ChannelStatus, Format, Platform } from "../db/constants";

export type Cap = "yes" | "partial" | "no";
export type CatalogEntry = { name: string; badge: string; bg: string; fg: string; post: Cap; stats: Cap; formats: Format[]; url: string; api: string };

export const CATALOG: Record<Platform, CatalogEntry> = {
  facebook: { name: "Facebook", badge: "f", bg: "#1877F2", fg: "#fff", post: "yes", stats: "yes", formats: ["reel", "video", "image", "carousel", "article"], url: "https://www.facebook.com/", api: "Meta Graph API (Pages)" },
  instagram: { name: "Instagram", badge: "IG", bg: "#D6246E", fg: "#fff", post: "yes", stats: "yes", formats: ["reel", "video", "image", "carousel"], url: "https://www.instagram.com/", api: "Instagram Graph API" },
  youtube: { name: "YouTube", badge: "YT", bg: "#E62117", fg: "#fff", post: "yes", stats: "yes", formats: ["video", "reel"], url: "https://studio.youtube.com/", api: "YouTube Data API v3 + Analytics API" },
  tiktok: { name: "TikTok", badge: "TT", bg: "#111111", fg: "#fff", post: "partial", stats: "partial", formats: ["reel", "video", "image", "carousel"], url: "https://www.tiktok.com/", api: "TikTok Content Posting API + Display API" },
  x: { name: "X", badge: "X", bg: "#000000", fg: "#fff", post: "partial", stats: "partial", formats: ["reel", "video", "image", "carousel", "article"], url: "https://x.com/", api: "X API v2" },
  lemon8: { name: "Lemon8", badge: "L8", bg: "#F5DC3B", fg: "#1A1A1A", post: "no", stats: "no", formats: [], url: "https://www.lemon8-app.com/", api: "ไม่มี API สาธารณะ" },
  line: { name: "LINE OA", badge: "LN", bg: "#06C755", fg: "#fff", post: "yes", stats: "partial", formats: ["reel", "video", "image", "carousel", "article"], url: "https://manager.line.biz/", api: "LINE Messaging API" },
  web: { name: "เว็บไซต์", badge: "W", bg: "#4B5571", fg: "#fff", post: "yes", stats: "yes", formats: ["reel", "video", "image", "carousel", "article"], url: "https://wordpress.com/", api: "WordPress REST API + GA4 Data API" },
};

export const CAP_LABEL: Record<Cap, string> = { yes: "ได้", partial: "บางส่วน", no: "ไม่ได้" };

/** ช่องทางนี้จะโพสต์อย่างไรเมื่อกดเผยแพร่ */
export function publishMode(channel: { platform: Platform; status: ChannelStatus } | undefined, format: Format, workType: { manualOnly: boolean } | null | undefined): { mode: "auto" | "manual"; reason: string } {
  if (workType?.manualOnly) return { mode: "manual", reason: "งานประเภทนี้ต้องทำในระบบของแพลตฟอร์มเอง" };
  if (!channel) return { mode: "manual", reason: "ยังไม่ได้เชื่อมต่อบัญชี" };
  const c = CATALOG[channel.platform];
  if (c.post === "no") return { mode: "manual", reason: "แพลตฟอร์มไม่มี API สำหรับโพสต์" };
  if (channel.status !== "connected") return { mode: "manual", reason: "ยังไม่ได้เชื่อมต่อบัญชี" };
  if (!c.formats.includes(format)) return { mode: "manual", reason: "API ไม่รองรับรูปแบบนี้" };
  return { mode: "auto", reason: "โพสต์อัตโนมัติผ่าน API" };
}
