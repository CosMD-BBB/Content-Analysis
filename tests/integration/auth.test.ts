import { eq } from "drizzle-orm";
import { beforeEach, expect, test } from "vitest";
import { adminResetPassword, getUserBySession, login, logout, register, requestPasswordReset, resetPassword } from "@/src/auth/service";
import { passwordResets, sessions, users } from "@/src/db/schema";
import { hashToken } from "@/src/lib/tokens";
import { resetDb, testDb } from "../helpers";

const db = testDb();
beforeEach(() => resetDb(db));
const reg = (email: string, password = "password1") => register(db, { name: "N", email, password });

test("first user becomes super admin, second does not", async () => {
  const a = await reg("a@x.com"), b = await reg("b@x.com");
  const rows = await db.select().from(users);
  expect(rows.find((u) => u.id === (a as { userId: string }).userId)!.isSuperAdmin).toBe(true);
  expect(rows.find((u) => u.id === (b as { userId: string }).userId)!.isSuperAdmin).toBe(false);
});

test("email is case-insensitive", async () => {
  await reg("A@x.com");
  expect(await reg("a@X.com")).toEqual({ ok: false, error: "email_taken" });
});

test("password shorter than 8 → weak_password", async () => {
  expect(await reg("a@x.com", "1234567")).toEqual({ ok: false, error: "weak_password" });
});

test("wrong password and unknown email give the same error", async () => {
  await reg("a@x.com");
  expect(await login(db, { email: "a@x.com", password: "nope-nope" })).toEqual({ ok: false, error: "invalid_credentials" });
  expect(await login(db, { email: "z@x.com", password: "password1" })).toEqual({ ok: false, error: "invalid_credentials" });
});

test("login then session resolves; logout removes it", async () => {
  await reg("a@x.com");
  const r = await login(db, { email: "A@x.com", password: "password1" });
  if (!r.ok) throw new Error("login failed");
  expect((await getUserBySession(db, r.sessionId))?.email).toBe("a@x.com");
  await logout(db, r.sessionId);
  expect(await getUserBySession(db, r.sessionId)).toBeNull();
});

test("expired session → null", async () => {
  await reg("a@x.com");
  const r = await login(db, { email: "a@x.com", password: "password1" });
  if (!r.ok) throw new Error();
  await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.id, hashToken(r.sessionId)));
  expect(await getUserBySession(db, r.sessionId)).toBeNull();
});

test("adminResetPassword by non-super-admin throws", async () => {
  const a = await reg("a@x.com"), b = await reg("b@x.com");
  if (!a.ok || !b.ok) throw new Error();
  await expect(adminResetPassword(db, b.userId, a.userId)).rejects.toThrow("forbidden");
  const temp = await adminResetPassword(db, a.userId, b.userId);
  expect((await login(db, { email: "b@x.com", password: temp })).ok).toBe(true);
});

test("reset token works once and expires after 1 hour", async () => {
  await reg("a@x.com");
  const t = (await requestPasswordReset(db, "a@x.com"))!;
  expect(await resetPassword(db, t, "newpassword")).toEqual({ ok: true });
  expect((await resetPassword(db, t, "another-pw")).ok).toBe(false);
  expect((await login(db, { email: "a@x.com", password: "newpassword" })).ok).toBe(true);
  const t2 = (await requestPasswordReset(db, "a@x.com"))!;
  await db.update(passwordResets).set({ expiresAt: new Date(Date.now() - 1) }).where(eq(passwordResets.tokenHash, hashToken(t2)));
  expect((await resetPassword(db, t2, "newpassword2")).ok).toBe(false);
});

test("unknown email reset request returns null silently", async () => {
  expect(await requestPasswordReset(db, "nobody@x.com")).toBeNull();
});
