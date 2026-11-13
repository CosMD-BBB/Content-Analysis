import Link from "next/link";
import { AuthForm, AuthShell } from "@/components/auth-form";
import { registerAction } from "../actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="สมัครใช้งาน"
      sub="ใช้อีเมลอะไรก็ได้ หลังสมัคร แอดมินของโปรเจกต์จะเพิ่มคุณเข้าทีม หรือเปิดลิงก์เชิญที่ได้รับ"
      foot={<>มีบัญชีแล้ว? <Link href={`/login${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`}>เข้าสู่ระบบ</Link></>}
    >
      <AuthForm
        action={registerAction}
        hidden={{ next: sp.next ?? "/projects" }}
        submit="สมัครใช้งาน"
        fields={[
          { name: "name", label: "ชื่อที่ให้ทีมเห็น", autoComplete: "name" },
          { name: "email", label: "อีเมล", type: "email", autoComplete: "email" },
          { name: "password", label: "รหัสผ่าน", type: "password", autoComplete: "new-password", hint: "อย่างน้อย 8 ตัวอักษร" },
        ]}
      />
    </AuthShell>
  );
}
