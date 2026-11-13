import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { AuthShell } from "@/components/auth-form";
import { Submit } from "@/components/submit";
import { requireUser } from "@/src/auth/session";
import { getDb } from "@/src/db/client";
import { emailConfigured } from "@/src/notify/email";
import { getPrefs } from "@/src/notify/service";
import { changePasswordAction } from "./actions";
import { prefsAction } from "./notify-actions";

export default async function AccountPage() {
  const user = await requireUser();
  const prefs = await getPrefs(getDb(), user.id);
  return (
    <AuthShell title="บัญชีของฉัน" sub={`${user.name} · ${user.email}`} foot={<Link href="/">กลับไปทำงาน</Link>}>
      <h2>เปลี่ยนรหัสผ่าน</h2>
      <ActionForm action={changePasswordAction} success="เปลี่ยนรหัสผ่านแล้ว" resetOnSuccess style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="field"><label htmlFor="pw-old">รหัสผ่านปัจจุบัน</label><input className="input" id="pw-old" name="old" type="password" required autoComplete="current-password" /></div>
        <div className="field"><label htmlFor="pw-new">รหัสผ่านใหม่</label><input className="input" id="pw-new" name="new" type="password" required autoComplete="new-password" /><span className="hint">อย่างน้อย 8 ตัวอักษร</span></div>
        <Submit>บันทึกรหัสผ่านใหม่</Submit>
      </ActionForm>
      <h2 style={{ marginTop: 10 }}>การแจ้งเตือน</h2>
      <ActionForm action={prefsAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="check"><input type="checkbox" name="inApp" defaultChecked={prefs.inApp} />แจ้งเตือนในระบบ (กระดิ่งมุมขวาบน)</label>
        <label className="check"><input type="checkbox" name="email" defaultChecked={prefs.email} />ส่งอีเมลถึง {user.email}</label>
        {!emailConfigured() && <span className="small faint">ระบบยังไม่ได้ตั้งค่าการส่งอีเมล ตอนนี้จึงแจ้งเตือนได้เฉพาะในระบบ</span>}
        <Submit className="btn">บันทึกการแจ้งเตือน</Submit>
      </ActionForm>
    </AuthShell>
  );
}
