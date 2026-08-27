import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const sqlFiles = process.argv.slice(2);

if (sqlFiles.length === 0) {
  console.error("Usage: node scripts/db-apply-sql.mjs migrations/<file>.sql [...]");
  process.exit(1);
}
const migrationsDir = path.resolve(process.cwd(), "migrations");

const connectionString = process.env.DATABASE_CONNECTION ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_CONNECTION is required");
  process.exit(1);
}

function databasePoolConfig(connection) {
  const parts = connection.split(";");
  if (parts.length === 4 && parts.every(Boolean)) {
    const [hostAndPort, database, user, password] = parts;
    const [host, port] = hostAndPort.split(":");
    return {
      host,
      port: port ? Number(port) : undefined,
      database,
      user,
      password,
    };
  }

  return { connectionString: connection };
}

const pool = new Pool(databasePoolConfig(connectionString));

try {
  for (const sqlFile of sqlFiles) {
    const resolvedFile = path.resolve(process.cwd(), sqlFile);

    if (!resolvedFile.startsWith(`${migrationsDir}${path.sep}`) || !resolvedFile.endsWith(".sql")) {
      throw new Error(`Refusing to execute SQL outside the migrations directory: ${sqlFile}`);
    }

    const sql = await readFile(resolvedFile, "utf8");
    await pool.query(sql);
    console.log(`Applied ${path.relative(process.cwd(), resolvedFile)}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to apply SQL migration: ${message}`);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => undefined);
}
