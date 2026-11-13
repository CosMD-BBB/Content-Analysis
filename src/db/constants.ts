/* ค่าคงที่และชนิดข้อมูลที่ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ (ไม่มี import ของฐานข้อมูล) */
export const PLATFORMS = ["facebook", "instagram", "youtube", "tiktok", "x", "lemon8", "line", "web"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const FORMATS = ["reel", "video", "image", "carousel", "article"] as const;
export type Format = (typeof FORMATS)[number];

export const CONTENT_STATUSES = ["idea", "draft", "review", "changes", "approved", "scheduled", "published"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const ROLES = ["admin", "manager", "creator", "analyst"] as const;
export type Role = (typeof ROLES)[number];

export const PUBLISH_STATES = ["pending", "posted", "manual_todo", "manual_done", "failed"] as const;
export type PublishState = (typeof PUBLISH_STATES)[number];

export type ChannelStatus = "not_connected" | "connected" | "coming_soon";
