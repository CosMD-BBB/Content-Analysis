import { can, canEditContent } from "../access/permissions";
import type { ContentStatus, Role } from "../db/constants";

export type ContentAction = "start" | "submit" | "withdraw" | "approve" | "requestChanges" | "schedule" | "unschedule" | "publish";

/** สถานะถัดไปเมื่อทำ action นี้ หรือ null ถ้าทำไม่ได้ */
export function nextStatus(status: ContentStatus, action: ContentAction, role: Role, isOwner: boolean): ContentStatus | null {
  switch (action) {
    case "start":
      return status === "idea" && canEditContent(role, isOwner, status) ? "draft" : null;
    case "submit":
      return ["idea", "draft", "changes"].includes(status) && ((isOwner && can(role, "create")) || can(role, "editAny")) ? "review" : null;
    case "withdraw":
      return status === "review" && ((isOwner && can(role, "create")) || can(role, "editAny")) ? "draft" : null;
    case "approve":
      return status === "review" && can(role, "approve") ? "approved" : null;
    case "requestChanges":
      return status === "review" && can(role, "approve") ? "changes" : null;
    case "schedule":
      return status === "approved" && can(role, "publish") ? "scheduled" : null;
    case "unschedule":
      return status === "scheduled" && can(role, "publish") ? "approved" : null;
    case "publish":
      return (status === "approved" || status === "scheduled") && can(role, "publish") ? "published" : null;
  }
}

export const ACTION_LOG: Record<ContentAction, string> = {
  start: "เริ่มทำงาน",
  submit: "ส่งคอนเทนต์ให้อนุมัติ",
  withdraw: "ดึงงานกลับมาแก้",
  approve: "อนุมัติ",
  requestChanges: "ขอแก้ไข",
  schedule: "ตั้งเวลาโพสต์",
  unschedule: "ยกเลิกการตั้งเวลา",
  publish: "เผยแพร่",
};
