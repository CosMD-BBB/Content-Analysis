import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import type { DB } from "../db/client";
import { passwordResets, sessions, users, type User } from "../db/schema";
import { ForbiddenError } from "../lib/errors";
import { hashToken, newToken } from "../lib/tokens";
import { sendEmail } from "../notify/email";
import { hashPassword, MIN_PASSWORD, verifyPassword } from "./password";

const SESSION_DAYS = 30;
const RENEW_BELOW_DAYS = 15;
const DAY = 864e5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PublicUser = Pick<User, "id" | "email" | "name" | "isSuperAdmin">;
const pub = (u: User): PublicUser => ({ id: u.id, email: u.email, name: u.name, isSuperAdmin: u.isSuperAdmin });

const findByEmail = async (db: DB, email: string) =>
  (await db.select().from(users).where(eq(sql`lower(${users.email})`, email.trim().toLowerCase())).limit(1))[0];

export async function register(
  db: DB,
  input: { name: string; email: string; password: string },
): Promise<{ ok: true; userId: string } | { ok: false; error: "email_taken" | "weak_password" | "invalid_email" | "name_required" }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "name_required" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "invalid_email" };
  if (input.password.length < MIN_PASSWORD) return { ok: false, error: "weak_password" };
  if (await findByEmail(db, email)) return { ok: false, error: "email_taken" };
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await db.transaction(async (tx) => {
      // ล็อกตาราง users เพื่อให้มีเจ้าของระบบได้คนเดียวแม้สมัครพร้อมกัน
      await tx.execute(sql`lock table ${users} in share row exclusive mode`);
      const [{ n }] = await tx.select({ n: count() }).from(users);
      const [u] = await tx.insert(users).values({ email, name, passwordHash, isSuperAdmin: n === 0 }).returning();
      return u;
    });
    return { ok: true, userId: user.id };
  } catch (e) {
    if (String((e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code) === "23505") return { ok: false, error: "email_taken" };
    throw e;
  }
}

async function createSession(db: DB, userId: string): Promise<string> {
  const token = newToken();
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * DAY) });
  return token;
}

export async function login(
  db: DB,
  input: { email: string; password: string },
): Promise<{ ok: true; sessionId: string } | { ok: false; error: "invalid_credentials" }> {
  const u = await findByEmail(db, input.email);
  if (!u || !(await verifyPassword(input.password, u.passwordHash))) return { ok: false, error: "invalid_credentials" };
  return { ok: true, sessionId: await createSession(db, u.id) };
}

export async function getUserBySession(db: DB, sessionId: string): Promise<PublicUser | null> {
  const id = hashToken(sessionId);
  const row = (await db.select().from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.id, id)).limit(1))[0];
  if (!row) return null;
  if (row.sessions.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (row.sessions.expiresAt.getTime() - Date.now() < RENEW_BELOW_DAYS * DAY) {
    await db.update(sessions).set({ expiresAt: new Date(Date.now() + SESSION_DAYS * DAY) }).where(eq(sessions.id, id));
  }
  return pub(row.users);
}

export async function logout(db: DB, sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(sessionId)));
}

export async function changePassword(db: DB, userId: string, oldPw: string, newPw: string): Promise<{ ok: true } | { ok: false; error: "invalid_credentials" | "weak_password" }> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || !(await verifyPassword(oldPw, u.passwordHash))) return { ok: false, error: "invalid_credentials" };
  if (newPw.length < MIN_PASSWORD) return { ok: false, error: "weak_password" };
  await db.update(users).set({ passwordHash: await hashPassword(newPw) }).where(eq(users.id, userId));
  return { ok: true };
}

/** เจ้าของระบบตั้งรหัสชั่วคราวให้ผู้ใช้ (ใช้เมื่อยังไม่ได้ตั้งค่าส่งอีเมล) */
export async function adminResetPassword(db: DB, actorId: string, targetUserId: string): Promise<string> {
  const [actor] = await db.select().from(users).where(eq(users.id, actorId));
  if (!actor?.isSuperAdmin) throw new ForbiddenError();
  const temp = newToken().slice(0, 10);
  await db.update(users).set({ passwordHash: await hashPassword(temp) }).where(eq(users.id, targetUserId));
  await db.delete(sessions).where(eq(sessions.userId, targetUserId));
  return temp;
}

/** ส่งลิงก์ตั้งรหัสใหม่ คืนค่า token เพื่อใช้ทดสอบ (หน้าเว็บไม่แสดง) */
export async function requestPasswordReset(db: DB, email: string, appUrl = process.env.APP_URL ?? "http://localhost:3000"): Promise<string | null> {
  const u = await findByEmail(db, email);
  if (!u) return null;
  const token = newToken();
  await db.insert(passwordResets).values({ tokenHash: hashToken(token), userId: u.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
  const link = `${appUrl}/reset?token=${token}`;
  await sendEmail(u.email, "ตั้งรหัสผ่านใหม่ · Content Studio", `<p>สวัสดี ${u.name}</p><p>กดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ 1 ชั่วโมง):</p><p><a href="${link}">${link}</a></p><p>ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร</p>`);
  return token;
}

export async function resetPassword(db: DB, token: string, newPw: string): Promise<{ ok: boolean; error?: "invalid_token" | "weak_password" }> {
  if (newPw.length < MIN_PASSWORD) return { ok: false, error: "weak_password" };
  const th = hashToken(token);
  const [row] = await db.select().from(passwordResets).where(and(eq(passwordResets.tokenHash, th), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())));
  if (!row) return { ok: false, error: "invalid_token" };
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.tokenHash, th));
  await db.update(users).set({ passwordHash: await hashPassword(newPw) }).where(eq(users.id, row.userId));
  await db.delete(sessions).where(eq(sessions.userId, row.userId));
  return { ok: true };
}
