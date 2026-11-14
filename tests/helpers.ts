import { sql } from "drizzle-orm";
import { createDb, type DB } from "../src/db/client";

let db: DB | undefined;
export function testDb(): DB {
  if (!db) db = createDb(process.env.TEST_DATABASE_URL!);
  return db;
}

export async function resetDb(d: DB) {
  const rows = await d.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public'`);
  const names = rows.map((r) => `"${r.tablename}"`).join(", ");
  if (names) await d.execute(sql.raw(`truncate ${names} restart identity cascade`));
}
