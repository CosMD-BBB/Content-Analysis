import Link from "next/link";
import { AuthForm, AuthShell } from "@/components/auth-form";
import { loginAction } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="เข้าสู่ระบบ"
      sub={sp.reset ? "ตั้งรหัสผ่านใหม่แล้ว เข้าสู่ระบบด้วยรหัสใหม่ได้เลย" : undefined}
      foot={
        <>
          ยังไม่มีบัญชี? <Link href={`/register${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`}>สมัครใช้งาน</Link> · <Link href="/reset">ลืมรหัสผ่าน</Link>
        </>
      }
    >
      <AuthForm
        action={loginAction}
        hidden={{ next: sp.next ?? "/projects" }}
        submit="เข้าสู่ระบบ"
        fields={[
          { name: "email", label: "อีเมล", type: "email", autoComplete: "email" },
          { name: "password", label: "รหัสผ่าน", type: "password", autoComplete: "current-password" },
        ]}
      />
    </AuthShell>
  );
}
