/** ข้อความที่แสดงบนหน้าเว็บ */
export const ERR: Record<string, string> = {
  email_taken: "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบ หรือกดลืมรหัสผ่าน",
  weak_password: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
  invalid_email: "รูปแบบอีเมลไม่ถูกต้อง",
  name_required: "กรอกชื่อของคุณ",
  invalid_credentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  invalid_token: "ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว ขอลิงก์ใหม่อีกครั้ง",
  forbidden: "คุณไม่มีสิทธิ์ทำรายการนี้",
  not_found: "ไม่พบข้อมูล",
  stale: "มีคนแก้งานนี้ไปแล้ว โหลดหน้าใหม่ก่อนบันทึก",
  comment_required: "พิมพ์สิ่งที่ต้องแก้ก่อนกดขอแก้ไข",
  time_in_past: "เวลาที่กำหนดผ่านไปแล้ว แก้วันเวลาก่อน หรือกดเผยแพร่ตอนนี้",
  invalid_action: "ทำรายการนี้กับงานในสถานะปัจจุบันไม่ได้",
  invalid_url: "วางลิงก์โพสต์ที่ขึ้นต้นด้วย https://",
  not_registered: "อีเมลนี้ยังไม่ได้สมัคร ส่งลิงก์เชิญให้เขาสมัครแทน",
  last_admin: "ต้องมีผู้ดูแลโปรเจกต์อย่างน้อย 1 คน",
  already_member: "คนนี้อยู่ในโปรเจกต์แล้ว",
  validation: "ข้อมูลไม่ครบหรือไม่ถูกต้อง",
};
export const errText = (code?: string) => (code ? ERR[code] ?? "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" : "");

export const ROLE_LABEL = { admin: "ผู้ดูแลโปรเจกต์", manager: "หัวหน้าคอนเทนต์", creator: "ครีเอเตอร์", analyst: "ฝ่ายวิเคราะห์" } as const;
export const ROLE_DESC = {
  admin: "ทำได้ทุกอย่างในโปรเจกต์ รวมถึงเชื่อมต่อช่องทางและจัดการสมาชิก",
  manager: "วางตาราง มอบหมายงาน อนุมัติ และกดเผยแพร่",
  creator: "สร้างและแก้คอนเทนต์ของตัวเอง แล้วส่งให้หัวหน้าอนุมัติ",
  analyst: "ดูตารางและรายงานผล กรอกตัวเลขของช่องทางที่ไม่มี API",
} as const;
export const STATUS_LABEL = { idea: "ไอเดีย", draft: "กำลังทำ", review: "รออนุมัติ", changes: "ขอแก้ไข", approved: "อนุมัติแล้ว", scheduled: "ตั้งเวลาแล้ว", published: "เผยแพร่แล้ว" } as const;
export const STATUS_TONE = { idea: "neutral", draft: "info", review: "warn", changes: "bad", approved: "accent", scheduled: "teal", published: "ok" } as const;
export const FORMAT_LABEL = { reel: "คลิปสั้น", video: "วิดีโอยาว", image: "รูปเดี่ยว", carousel: "อัลบั้ม/คารูเซล", article: "บทความ" } as const;
