import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL && process.env.SKIP_ENV_VALIDATION !== "true") {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(process.env.DATABASE_URL ?? "postgresql://user:pass@db.example.tld/neondb");

export const db = drizzle(sql, { schema });

export type DB = typeof db;
