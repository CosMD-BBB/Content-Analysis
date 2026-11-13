import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/register", "/reset", "/invite", "/api/health"];

/** ส่งคนที่ยังไม่ล็อกอินไปหน้าเข้าสู่ระบบ (การตรวจสิทธิ์จริงอยู่ฝั่งเซิร์ฟเวอร์ในทุก action) */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (req.cookies.get("cs_session")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // ไม่ผ่าน proxy สำหรับไฟล์ระบบ และ /api/upload (ไฟล์ใหญ่ ไม่ต้องให้ proxy อ่าน body)
  matcher: ["/((?!_next/|favicon.ico|api/upload|files/).*)"],
};
