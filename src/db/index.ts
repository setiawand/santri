import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

// Path file SQLite. Menerima "file:./dev.db" (gaya Prisma) maupun path biasa.
const dbPath = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };

const sqlite =
  globalForDb.sqlite ??
  (() => {
    const conn = new Database(dbPath);
    conn.pragma("journal_mode = WAL"); // tulis lebih cepat & konkuren
    conn.pragma("foreign_keys = ON"); // wajib agar onDelete cascade jalan
    return conn;
  })();

if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
