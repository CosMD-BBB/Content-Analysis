import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "../db/client";
import { getUserBySession, type PublicUser } from "./service";

export const SESSION_COOKIE = "cs_session";

export const currentUser = cache(async (): Promise<PublicUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getUserBySession(getDb(), token) : null;
});

export async function requireUser(): Promise<PublicUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
