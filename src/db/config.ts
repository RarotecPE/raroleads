export function getDatabaseConnection() {
  const connection = process.env.DATABASE_CONNECTION ?? process.env.DATABASE_URL;

  if (!connection) {
    throw new Error("DATABASE_CONNECTION is required");
  }

  return connection;
}
