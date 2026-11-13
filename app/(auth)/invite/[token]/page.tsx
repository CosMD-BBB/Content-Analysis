import Link from "next/link";
import { acceptInviteAction } from "@/app/(app)/projects/actions";
import { ActionForm } from "@/components/action-form";
import { AuthShell } from "@/components/auth-form";
import { Submit } from "@/components/submit";
import { currentUser } from "@/src/auth/session";
import { getDb } from "@/src/db/client";
import { ROLE_LABEL } from "@/src/i18n/th";
import { getInvite } from "@/src/projects/service";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await getInvite(getDb(), token);
  if (!inv)
    return (
      <AuthShell title="ลิงก์เชิญใช้ไม่ได้" sub="ลิงก์หมดอายุ (7 วัน) หรือถูกใช้ไปแล้ว ขอลิงก์ใหม่จากแอดมินของโปรเจกต์">
        <Link className="btn" href="/">ไปหน้าแรก</Link>
      </AuthShell>
    );
  const user = await currentUser();
  const next = encodeURIComponent(`/invite/${token}`);
  return (
    <AuthShell title={`คุณได้รับเชิญเข้าโปรเจกต์ ${inv.projectName}`} sub={`บทบาท: ${ROLE_LABEL[inv.inv.role]}`}>
      {user ? (
        <ActionForm action={acceptInviteAction}>
          <input type="hidden" name="token" value={token} />
          <p className="muted small" style={{ marginBottom: 10 }}>เข้าร่วมในชื่อ {user.name} ({user.email})</p>
          <Submit>เข้าร่วมโปรเจกต์</Submit>
        </ActionForm>
      ) : (
        <div className="row">
          <Link className="btn primary" href={`/register?next=${next}`}>สมัครใช้งาน</Link>
          <Link className="btn" href={`/login?next=${next}`}>มีบัญชีแล้ว เข้าสู่ระบบ</Link>
        </div>
      )}
    </AuthShell>
  );
}
