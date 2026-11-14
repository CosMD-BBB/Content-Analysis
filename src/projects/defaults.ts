import type { Platform } from "../db/schema";

export const DEFAULT_WORK_TYPES: { name: string; manualOnly: boolean }[] = [
  { name: "โพสต์ทั่วไป", manualOnly: false },
  { name: "VDO", manualOnly: false },
  { name: "Broadcast", manualOnly: false },
  { name: "Ads", manualOnly: true },
  { name: "Live", manualOnly: false },
  { name: "บทความ / SEO", manualOnly: false },
  { name: "KOL / Influencer", manualOnly: true },
  { name: "อื่นๆ", manualOnly: false },
];

export const DEFAULT_PILLARS: { name: string; color: string }[] = [
  { name: "ความรู้", color: "#2763C4" },
  { name: "รีวิวสินค้า", color: "#C2313B" },
  { name: "โปรโมชัน", color: "#A35F00" },
  { name: "เบื้องหลัง", color: "#0B7E8C" },
  { name: "เสียงลูกค้า", color: "#6B4FC8" },
];

/** ระยะ 1: ทุกช่องทางยังเชื่อมจริงไม่ได้ ยกเว้น Lemon8 ที่ไม่มี API (ไม่ต้องเชื่อม) */
export const initialChannelStatus = (p: Platform) => (p === "lemon8" ? "not_connected" : "coming_soon") as "not_connected" | "coming_soon";
