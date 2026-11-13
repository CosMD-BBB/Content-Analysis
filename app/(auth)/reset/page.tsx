import Link from "next/link";
import { AuthForm, AuthShell } from "@/components/auth-form";
import { requestResetAction, resetAction } from "../actions";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (token)
    return (
      <AuthShell title="ตั้งรหัสผ่านใหม่">
        <AuthForm action={resetAction} hidden={{ token }} submit="บันทึกรหัสผ่านใหม่" fields={[{ name: "password", label: "รหัสผ่านใหม่", type: "password", autoComplete: "new-password", hint: "อย่างน้อย 8 ตัวอักษร" }]} />
      </AuthShell>
    );
  return (
    <AuthShell
      title="ลืมรหัสผ่าน"
      sub="กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์ตั้งรหัสใหม่ให้ (ถ้าไม่ได้รับ ติดต่อเจ้าของระบบให้รีเซ็ตให้)"
      foot={<Link href="/login">กลับไปหน้าเข้าสู่ระบบ</Link>}
    >
      <AuthForm action={requestResetAction} submit="ส่งลิงก์ตั้งรหัสใหม่" successText="ถ้าอีเมลนี้มีในระบบ เราส่งลิงก์ไปแล้ว เช็กกล่องจดหมาย (รวมถึงจดหมายขยะ)" fields={[{ name: "email", label: "อีเมล", type: "email", autoComplete: "email" }]} />
    </AuthShell>
  );
}
