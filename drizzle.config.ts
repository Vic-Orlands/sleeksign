import { config } from "dotenv";
import type { Config } from "drizzle-kit";

config({ path: ".env.local" });
config();

const databaseVariable = process.env.DRIZZLE_DATABASE_ENV || "DATABASE_URL";
const databaseUrl = process.env[databaseVariable];

if (!databaseUrl) {
  throw new Error(`${databaseVariable} is required`);
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
