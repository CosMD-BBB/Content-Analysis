"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { login, logout, register, requestPasswordReset, resetPassword } from "@/src/auth/service";
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from "@/src/auth/session";
import { getDb } from "@/src/db/client";

export type FormState = { error?: string; ok?: boolean; values?: Record<string, string> } | undefined;
const str = (f: FormData, k: string) => String(f.get(k) ?? "");

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/projects";
}

export async function registerAction(_: FormState, f: FormData): Promise<FormState> {
  const values = { name: str(f, "name"), email: str(f, "email") };
  const r = await register(getDb(), { ...values, password: str(f, "password") });
  if (!r.ok) return { error: r.error, values };
  const l = await login(getDb(), { email: values.email, password: str(f, "password") });
  if (l.ok) await setSessionCookie(l.sessionId);
  redirect(safeNext(str(f, "next")));
}

export async function loginAction(_: FormState, f: FormData): Promise<FormState> {
  const values = { email: str(f, "email") };
  const r = await login(getDb(), { email: values.email, password: str(f, "password") });
  if (!r.ok) return { error: r.error, values };
  await setSessionCookie(r.sessionId);
  redirect(safeNext(str(f, "next")));
}

export async function logoutAction() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await logout(getDb(), token);
  await clearSessionCookie();
  redirect("/login");
}

export async function requestResetAction(_: FormState, f: FormData): Promise<FormState> {
  await requestPasswordReset(getDb(), str(f, "email"));
  return { ok: true };
}

export async function resetAction(_: FormState, f: FormData): Promise<FormState> {
  const r = await resetPassword(getDb(), str(f, "token"), str(f, "password"));
  if (!r.ok) return { error: r.error };
  redirect("/login?reset=1");
}
