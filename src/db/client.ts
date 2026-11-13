import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(url: string) {
  const client = postgres(url, { max: 10, onnotice: () => {} });
  return drizzle(client, { schema });
}

export type DB = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { __csDb?: DB };

/** การเชื่อมต่อฐานข้อมูลของแอป (สร้างครั้งแรกที่เรียกใช้) */
export function getDb(): DB {
  if (!globalForDb.__csDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.__csDb = createDb(url);
  }
  return globalForDb.__csDb;
}
