import { execSync } from "node:child_process";
import postgres from "postgres";
import { runMigrations } from "../src/db/migrate";

export default async function setup() {
  if (!process.env.TEST_DATABASE_URL) {
    const out = execSync("bash scripts/test-db.sh", { encoding: "utf8" });
    const m = out.match(/TEST_DATABASE_URL=(\S+)/);
    if (!m) throw new Error("could not start test database");
    process.env.TEST_DATABASE_URL = m[1];
  }
  const sql = postgres(process.env.TEST_DATABASE_URL, { onnotice: () => {} });
  await sql`drop schema if exists public cascade`;
  await sql`drop schema if exists drizzle cascade`;
  await sql`drop schema if exists pgboss cascade`;
  await sql`create schema public`;
  await sql.end();
  await runMigrations(process.env.TEST_DATABASE_URL);
}
