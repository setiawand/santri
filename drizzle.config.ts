import { defineConfig } from "drizzle-kit";

const dbPath = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: dbPath },
});
