import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('sqlite.db');
sqlite.pragma("foreign_keys = ON");
const documentColumns = sqlite.prepare("PRAGMA table_info(documents)").all() as Array<{ name: string }>;
if (documentColumns.length > 0 && !documentColumns.some((column) => column.name === "workspace_id")) {
  sqlite.exec('ALTER TABLE "documents" ADD COLUMN "workspace_id" text');
}
sqlite.exec(`
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" integer DEFAULT false NOT NULL,
  "image" text,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" integer NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL,
  "active_organization_id" text,
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" integer,
  "refresh_token_expires_at" integer,
  "scope" text,
  "password" text,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" integer NOT NULL,
  "created_at" integer,
  "updated_at" integer
);
CREATE TABLE IF NOT EXISTS "organization" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "logo" text,
  "metadata" text,
  "created_at" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "member" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL,
  "created_at" integer NOT NULL,
  FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS "invitation" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "status" text NOT NULL,
  "expires_at" integer NOT NULL,
  "inviter_id" text NOT NULL,
  "created_at" integer NOT NULL,
  FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade,
  FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE cascade
);
`);
export const db = drizzle(sqlite, { schema });
