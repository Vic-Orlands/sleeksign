import "dotenv/config";
import Database from "better-sqlite3";
import { neon } from "@neondatabase/serverless";

const sqlite = new Database("sqlite.db", { readonly: true });
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const sql = neon(databaseUrl);

function toTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  return new Date(value).toISOString();
}

function toBoolean(value) {
  if (value === null || value === undefined) return null;
  return Boolean(value);
}

function readRows(query) {
  return sqlite.prepare(query).all();
}

async function migrateUsers() {
  const rows = readRows(`select * from user`);

  for (const row of rows) {
    await sql`
      insert into "user" (
        "id",
        "name",
        "email",
        "email_verified",
        "image",
        "last_workspace_id",
        "created_at",
        "updated_at"
      )
      values (
        ${row.id},
        ${row.name},
        ${row.email},
        ${toBoolean(row.email_verified)},
        ${row.image ?? null},
        ${row.last_workspace_id ?? null},
        ${toTimestamp(row.created_at)},
        ${toTimestamp(row.updated_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from user`);
}

async function migrateOrganizations() {
  const rows = readRows(`select * from organization`);

  for (const row of rows) {
    await sql`
      insert into "organization" (
        "id",
        "name",
        "slug",
        "logo",
        "metadata",
        "created_at"
      )
      values (
        ${row.id},
        ${row.name},
        ${row.slug},
        ${row.logo ?? null},
        ${row.metadata ?? null},
        ${toTimestamp(row.created_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from organization`);
}

async function migrateMembers() {
  const rows = readRows(`select * from member`);

  for (const row of rows) {
    await sql`
      insert into "member" (
        "id",
        "organization_id",
        "user_id",
        "role",
        "created_at"
      )
      values (
        ${row.id},
        ${row.organization_id},
        ${row.user_id},
        ${row.role},
        ${toTimestamp(row.created_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from member`);
}

async function migrateInvitations() {
  const rows = readRows(`select * from invitation`);

  for (const row of rows) {
    await sql`
      insert into "invitation" (
        "id",
        "organization_id",
        "email",
        "role",
        "status",
        "expires_at",
        "inviter_id",
        "created_at"
      )
      values (
        ${row.id},
        ${row.organization_id},
        ${row.email},
        ${row.role},
        ${row.status},
        ${toTimestamp(row.expires_at)},
        ${row.inviter_id},
        ${toTimestamp(row.created_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from invitation`);
}

async function migrateDocuments() {
  const rows = readRows(`select * from documents`);

  for (const row of rows) {
    await sql`
      insert into "documents" (
        "id",
        "name",
        "file_url",
        "workspace_id",
        "signer_roles",
        "role_configs",
        "is_template",
        "archived_at",
        "deleted_at",
        "created_at"
      )
      values (
        ${row.id},
        ${row.name},
        ${row.file_url},
        ${row.workspace_id ?? null},
        ${row.signer_roles},
        ${row.role_configs},
        ${toBoolean(row.is_template) ?? false},
        ${toTimestamp(row.archived_at)},
        ${toTimestamp(row.deleted_at)},
        ${toTimestamp(row.created_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from documents`);
}

async function migrateFields() {
  const rows = readRows(`select * from fields`);

  for (const row of rows) {
    await sql`
      insert into "fields" (
        "id",
        "document_id",
        "type",
        "page",
        "x",
        "y",
        "width",
        "height",
        "required",
        "assignee_role"
      )
      values (
        ${row.id},
        ${row.document_id},
        ${row.type},
        ${row.page},
        ${row.x},
        ${row.y},
        ${row.width},
        ${row.height},
        ${toBoolean(row.required) ?? true},
        ${row.assignee_role}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from fields`);
}

async function migrateSessions() {
  const rows = readRows(`select * from sessions`);

  for (const row of rows) {
    await sql`
      insert into "sessions" (
        "id",
        "document_id",
        "status",
        "signer_name",
        "signer_email",
        "signer_role",
        "signer_ip",
        "signer_user_agent",
        "completed_at",
        "deleted_at",
        "created_at"
      )
      values (
        ${row.id},
        ${row.document_id},
        ${row.status},
        ${row.signer_name ?? null},
        ${row.signer_email ?? null},
        ${row.signer_role ?? null},
        ${row.signer_ip ?? null},
        ${row.signer_user_agent ?? null},
        ${toTimestamp(row.completed_at)},
        ${toTimestamp(row.deleted_at)},
        ${toTimestamp(row.created_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from sessions`);
}

async function migrateSignatures() {
  const rows = readRows(`select * from signatures`);

  for (const row of rows) {
    await sql`
      insert into "signatures" (
        "id",
        "session_id",
        "field_id",
        "value"
      )
      values (
        ${row.id},
        ${row.session_id},
        ${row.field_id},
        ${row.value}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from signatures`);
}

async function migrateSigningPackets() {
  const rows = readRows(`select * from signing_packets`);

  for (const row of rows) {
    await sql`
      insert into "signing_packets" (
        "id",
        "document_id",
        "mode",
        "role_configs",
        "status",
        "finalized_file_url",
        "completed_at",
        "created_at"
      )
      values (
        ${row.id},
        ${row.document_id},
        ${row.mode},
        ${row.role_configs},
        ${row.status},
        ${row.finalized_file_url ?? null},
        ${toTimestamp(row.completed_at)},
        ${toTimestamp(row.created_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from signing_packets`);
}

async function migrateSigningPacketCopies() {
  const rows = readRows(`select * from signing_packet_copies`);

  for (const row of rows) {
    await sql`
      insert into "signing_packet_copies" (
        "id",
        "packet_id",
        "role_name",
        "signer_name",
        "signer_email",
        "status",
        "finalized_file_url",
        "completed_at",
        "created_at"
      )
      values (
        ${row.id},
        ${row.packet_id},
        ${row.role_name},
        ${row.signer_name ?? null},
        ${row.signer_email ?? null},
        ${row.status},
        ${row.finalized_file_url ?? null},
        ${toTimestamp(row.completed_at)},
        ${toTimestamp(row.created_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from signing_packet_copies`);
}

async function migrateSigningPacketValues() {
  const rows = readRows(`select * from signing_packet_values`);

  for (const row of rows) {
    await sql`
      insert into "signing_packet_values" (
        "id",
        "packet_id",
        "copy_id",
        "field_id",
        "role_name",
        "value",
        "signer_name",
        "signer_email",
        "completed_at",
        "created_at",
        "updated_at"
      )
      values (
        ${row.id},
        ${row.packet_id},
        ${row.copy_id ?? null},
        ${row.field_id},
        ${row.role_name},
        ${row.value},
        ${row.signer_name ?? null},
        ${row.signer_email ?? null},
        ${toTimestamp(row.completed_at)},
        ${toTimestamp(row.created_at)},
        ${toTimestamp(row.updated_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from signing_packet_values`);
}

async function migrateAccounts() {
  const rows = readRows(`select * from account`);

  for (const row of rows) {
    await sql`
      insert into "account" (
        "id",
        "account_id",
        "provider_id",
        "user_id",
        "access_token",
        "refresh_token",
        "id_token",
        "access_token_expires_at",
        "refresh_token_expires_at",
        "scope",
        "password",
        "created_at",
        "updated_at"
      )
      values (
        ${row.id},
        ${row.account_id},
        ${row.provider_id},
        ${row.user_id},
        ${row.access_token ?? null},
        ${row.refresh_token ?? null},
        ${row.id_token ?? null},
        ${toTimestamp(row.access_token_expires_at)},
        ${toTimestamp(row.refresh_token_expires_at)},
        ${row.scope ?? null},
        ${row.password ?? null},
        ${toTimestamp(row.created_at)},
        ${toTimestamp(row.updated_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from account`);
}

async function migrateAuthSessions() {
  const rows = readRows(`select * from session`);

  for (const row of rows) {
    await sql`
      insert into "session" (
        "id",
        "expires_at",
        "token",
        "created_at",
        "updated_at",
        "ip_address",
        "user_agent",
        "user_id",
        "active_organization_id"
      )
      values (
        ${row.id},
        ${toTimestamp(row.expires_at)},
        ${row.token},
        ${toTimestamp(row.created_at)},
        ${toTimestamp(row.updated_at)},
        ${row.ip_address ?? null},
        ${row.user_agent ?? null},
        ${row.user_id},
        ${row.active_organization_id ?? null}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from session`);
}

async function migrateVerifications() {
  const rows = readRows(`select * from verification`);

  for (const row of rows) {
    await sql`
      insert into "verification" (
        "id",
        "identifier",
        "value",
        "expires_at",
        "created_at",
        "updated_at"
      )
      values (
        ${row.id},
        ${row.identifier},
        ${row.value},
        ${toTimestamp(row.expires_at)},
        ${toTimestamp(row.created_at)},
        ${toTimestamp(row.updated_at)}
      )
      on conflict ("id") do nothing
    `;
  }

  console.log(`Migrated ${rows.length} rows from verification`);
}

async function main() {
  await migrateUsers();
  await migrateOrganizations();
  await migrateMembers();
  await migrateInvitations();
  await migrateDocuments();
  await migrateFields();
  await migrateSessions();
  await migrateSignatures();
  await migrateSigningPackets();
  await migrateSigningPacketCopies();
  await migrateSigningPacketValues();
  await migrateAccounts();
  await migrateAuthSessions();
  await migrateVerifications();
}

main()
  .then(() => {
    console.log("SQLite to Neon migration complete");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
