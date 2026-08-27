import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabasePoolConfig } from "@/db/config";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool(getDatabasePoolConfig());

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
