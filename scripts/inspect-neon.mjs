import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured in .env.local");
}

const sql = neon(process.env.DATABASE_URL);

const tables = await sql`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
  order by table_name
`;

const migrations = await sql`
  select table_schema, table_name
  from information_schema.tables
  where table_name = '__drizzle_migrations'
  order by table_schema, table_name
`;

console.log("tables", JSON.stringify(tables, null, 2));
console.log("migrations", JSON.stringify(migrations, null, 2));
