import type { ContentStatus, Role } from "../db/schema";

export type Perm = "create" | "editAny" | "assign" | "approve" | "publish" | "manual" | "metrics" | "reports" | "channels" | "team";

export const PERMS: { perm: Perm; label: string; roles: Role[] }[] = [
  { perm: "create", label: "สร้างคอนเทนต์ใหม่", roles: ["admin", "manager", "creator"] },
  { perm: "editAny", label: "แก้ไขคอนเทนต์ของทุกคน", roles: ["admin", "manager"] },
  { perm: "assign", label: "มอบหมายงานให้คนอื่น", roles: ["admin", "manager"] },
  { perm: "approve", label: "อนุมัติ / ขอแก้ไข", roles: ["admin", "manager"] },
  { perm: "publish", label: "กดเผยแพร่ / ตั้งเวลาโพสต์", roles: ["admin", "manager"] },
  { perm: "manual", label: "ยืนยันงานที่ต้องโพสต์เอง", roles: ["admin", "manager", "creator"] },
  { perm: "metrics", label: "กรอกตัวเลขผลลัพธ์เอง", roles: ["admin", "manager", "analyst"] },
  { perm: "reports", label: "ดูรายงานผล", roles: ["admin", "manager", "creator", "analyst"] },
  { perm: "channels", label: "เชื่อมต่อ / ตัดการเชื่อมต่อช่องทาง", roles: ["admin"] },
  { perm: "team", label: "จัดการสมาชิก ประเภทงาน และหมวด", roles: ["admin"] },
];

export function can(role: Role, perm: Perm): boolean {
  return PERMS.find((p) => p.perm === perm)!.roles.includes(role);
}

export function canEditContent(role: Role, isOwner: boolean, status: ContentStatus): boolean {
  if (status === "published") return false;
  if (can(role, "editAny")) return true;
  return can(role, "create") && isOwner && (status === "idea" || status === "draft" || status === "changes");
}
