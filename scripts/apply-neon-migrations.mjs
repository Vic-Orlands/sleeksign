import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured in .env.local");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "drizzle" });

console.log("Neon migrations applied successfully");
