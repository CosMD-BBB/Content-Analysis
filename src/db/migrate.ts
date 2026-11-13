import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { createDb } from "./client";

export async function runMigrations(url: string) {
  const db = createDb(url);
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await db.$client.end();
}

if (process.argv[1] && /migrate\.(ts|js)$/.test(process.argv[1])) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  runMigrations(url).then(() => console.log("migrations applied"));
}
