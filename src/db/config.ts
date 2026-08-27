import type { PoolConfig } from "pg";

interface LegacyDatabaseConnection {
  hostAndPort: string;
  database: string;
  user: string;
  password: string;
}

function parseLegacyDatabaseConnection(connection: string): LegacyDatabaseConnection | null {
  const parts = connection.split(";");
  if (parts.length !== 4 || !parts.every(Boolean)) return null;

  const [hostAndPort, database, user, password] = parts;
  return { hostAndPort, database, user, password };
}

export function normalizeDatabaseConnection(connection: string) {
  if (/^postgres(ql)?:\/\//.test(connection)) return connection;

  const legacy = parseLegacyDatabaseConnection(connection);
  if (legacy) {
    return `postgresql://${encodeURIComponent(legacy.user)}:${encodeURIComponent(legacy.password)}@${legacy.hostAndPort}/${encodeURIComponent(legacy.database)}`;
  }

  return connection;
}

export function getDatabaseConnection() {
  const connection = process.env.DATABASE_CONNECTION ?? process.env.DATABASE_URL;

  if (!connection) {
    throw new Error("DATABASE_CONNECTION is required");
  }

  return normalizeDatabaseConnection(connection);
}

export function getDatabasePoolConfig(): PoolConfig {
  const connection = process.env.DATABASE_CONNECTION ?? process.env.DATABASE_URL;

  if (!connection) {
    throw new Error("DATABASE_CONNECTION is required");
  }

  const legacy = parseLegacyDatabaseConnection(connection);
  if (!legacy) return { connectionString: normalizeDatabaseConnection(connection) };

  const [host, port] = legacy.hostAndPort.split(":");
  return {
    host,
    port: port ? Number(port) : undefined,
    database: legacy.database,
    user: legacy.user,
    password: legacy.password,
  };
}
