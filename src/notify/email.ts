import nodemailer from "nodemailer";

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

/** ส่งอีเมล; ถ้ายังไม่ได้ตั้งค่า SMTP จะข้ามและคืน false */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!emailConfigured()) {
    console.info(`[email skipped: SMTP not configured] to=${to} subject=${subject}`);
    return false;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, html });
  return true;
}
