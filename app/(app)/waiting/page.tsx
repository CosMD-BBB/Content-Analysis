import { redirect } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/auth-form";
import { requireUser } from "@/src/auth/session";
import { getDb } from "@/src/db/client";
import { listMyProjects } from "@/src/projects/service";

export default async function WaitingPage() {
  const user = await requireUser();
  if ((await listMyProjects(getDb(), user.id)).length) redirect("/");
  return (
    <AuthShell title={`บัญชีของคุณพร้อมแล้ว, ${user.name}`} sub="ตอนนี้คุณยังไม่ได้อยู่ในโปรเจกต์ใด">
      <div className="banner">
        <div>
          รอแอดมินเพิ่มคุณเข้าโปรเจกต์ โดยแจ้งอีเมล <b>{user.email}</b> ให้แอดมิน
          หรือเปิดลิงก์เชิญที่ได้รับ เมื่อถูกเพิ่มแล้วโหลดหน้านี้ใหม่
        </div>
      </div>
      <form action={logoutAction}><button className="btn" type="submit">ออกจากระบบ</button></form>
    </AuthShell>
  );
}
