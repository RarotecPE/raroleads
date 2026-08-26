import { defineConfig } from "drizzle-kit";
import { getDatabaseConnection } from "./src/db/config";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: getDatabaseConnection(),
  },
});
