DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "documents" d
    LEFT JOIN "organization" o ON o."id" = d."workspace_id"
    WHERE d."workspace_id" IS NULL OR o."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot protect documents: every document must belong to a valid workspace';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "sessions" s
    LEFT JOIN "signing_packets" p ON p."id" = 'legacy-session:' || s."id"
    LEFT JOIN "signing_packet_copies" c ON c."id" = s."id"
    WHERE p."id" IS NOT NULL OR c."id" IS NOT NULL
  ) OR EXISTS (
    SELECT 1
    FROM "signatures" sig
    JOIN "signing_packet_values" v ON v."id" = 'legacy-signature:' || sig."id"
  ) THEN
    RAISE EXCEPTION 'Cannot migrate signing sessions: generated packet identifiers already exist';
  END IF;

  IF EXISTS (SELECT 1 FROM "teams" GROUP BY "organization_id", "slug" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot add team slug protection: duplicate workspace team slugs exist';
  END IF;

  IF EXISTS (SELECT 1 FROM "workspace_signers" GROUP BY "organization_id", "email" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot add signer protection: duplicate workspace signer emails exist';
  END IF;

  IF EXISTS (SELECT 1 FROM "organization_branding" GROUP BY "organization_id" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot add branding protection: duplicate workspace branding rows exist';
  END IF;

  IF EXISTS (SELECT 1 FROM "custom_domains" GROUP BY "hostname" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot add custom domain protection: duplicate hostnames exist';
  END IF;

  IF EXISTS (SELECT 1 FROM "bulk_send_rows" GROUP BY "job_id", "row_index" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot add bulk row protection: duplicate job row indexes exist';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "signing_packet_copies" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint

INSERT INTO "signing_packets" (
  "id",
  "document_id",
  "workspace_id",
  "team_id",
  "mode",
  "role_configs",
  "require_otp",
  "status",
  "created_at",
  "updated_at"
)
SELECT
  'legacy-session:' || s."id",
  s."document_id",
  d."workspace_id",
  s."team_id",
  'individual',
  jsonb_build_array(
    jsonb_build_object(
      'name', coalesce(nullif(s."signer_role", ''), 'Signer'),
      'scope', 'private'
    )
  )::text,
  s."verification_required",
  'active',
  s."created_at",
  s."updated_at"
FROM "sessions" s
JOIN "documents" d ON d."id" = s."document_id";--> statement-breakpoint

INSERT INTO "signing_packet_copies" (
  "id",
  "packet_id",
  "team_id",
  "role_name",
  "signer_name",
  "signer_email",
  "recipient_type",
  "status",
  "finalized_file_url",
  "finalized_storage_key",
  "completed_at",
  "deleted_at",
  "created_at",
  "updated_at"
)
SELECT
  s."id",
  'legacy-session:' || s."id",
  s."team_id",
  coalesce(nullif(s."signer_role", ''), 'Signer'),
  s."signer_name",
  s."signer_email",
  'email',
  s."status",
  s."finalized_file_url",
  s."finalized_storage_key",
  s."completed_at",
  s."deleted_at",
  s."created_at",
  s."updated_at"
FROM "sessions" s;--> statement-breakpoint

INSERT INTO "signing_packet_values" (
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
SELECT
  'legacy-signature:' || sig."id",
  'legacy-session:' || s."id",
  s."id",
  sig."field_id",
  coalesce(nullif(s."signer_role", ''), 'Signer'),
  sig."value",
  s."signer_name",
  s."signer_email",
  CASE WHEN s."status" = 'completed' THEN s."completed_at" ELSE NULL END,
  s."created_at",
  s."updated_at"
FROM "signatures" sig
JOIN "sessions" s ON s."id" = sig."session_id";--> statement-breakpoint

UPDATE "audit_logs"
SET
  "packet_id" = coalesce("packet_id", 'legacy-session:' || "session_id"),
  "packet_copy_id" = CASE
    WHEN "packet_id" IS NULL THEN coalesce("packet_copy_id", "session_id")
    ELSE "packet_copy_id"
  END
WHERE "session_id" IS NOT NULL;--> statement-breakpoint

UPDATE "signer_verification_challenges"
SET
  "packet_id" = coalesce("packet_id", 'legacy-session:' || "session_id"),
  "copy_id" = CASE
    WHEN "packet_id" IS NULL THEN coalesce("copy_id", "session_id")
    ELSE "copy_id"
  END
WHERE "session_id" IS NOT NULL;--> statement-breakpoint

ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_session_id_sessions_id_fk";--> statement-breakpoint
ALTER TABLE "signer_verification_challenges" DROP CONSTRAINT "signer_verification_challenges_session_id_sessions_id_fk";--> statement-breakpoint

ALTER TABLE "audit_logs" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "session_id";--> statement-breakpoint
ALTER TABLE "custom_domains" DROP COLUMN "domain";--> statement-breakpoint
ALTER TABLE "signer_verification_challenges" DROP COLUMN "session_id";--> statement-breakpoint
ALTER TABLE "signing_packets" DROP COLUMN "verification_mode";--> statement-breakpoint

DROP TABLE "signatures";--> statement-breakpoint
DROP TABLE "sessions";--> statement-breakpoint

UPDATE "session" s
SET "active_organization_id" = NULL
WHERE s."active_organization_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "organization" o WHERE o."id" = s."active_organization_id");--> statement-breakpoint

UPDATE "user" u
SET "last_workspace_id" = NULL
WHERE u."last_workspace_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "organization" o WHERE o."id" = u."last_workspace_id");--> statement-breakpoint

UPDATE "audit_logs" a
SET "bulk_send_job_id" = NULL
WHERE a."bulk_send_job_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "bulk_send_jobs" j WHERE j."id" = a."bulk_send_job_id");--> statement-breakpoint

UPDATE "signing_packet_copies" c
SET "bulk_send_job_id" = NULL
WHERE c."bulk_send_job_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "bulk_send_jobs" j WHERE j."id" = c."bulk_send_job_id");--> statement-breakpoint

UPDATE "signing_packet_copies" c
SET "bulk_send_row_id" = NULL
WHERE c."bulk_send_row_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "bulk_send_rows" r WHERE r."id" = c."bulk_send_row_id");--> statement-breakpoint

WITH ranked_members AS (
  SELECT
    "id",
    first_value("id") OVER (
      PARTITION BY "organization_id", "user_id"
      ORDER BY "created_at", "id"
    ) AS keeper_id,
    row_number() OVER (
      PARTITION BY "organization_id", "user_id"
      ORDER BY "created_at", "id"
    ) AS duplicate_number
  FROM "member"
)
UPDATE "team_members" tm
SET "member_id" = ranked_members.keeper_id
FROM ranked_members
WHERE tm."member_id" = ranked_members."id"
  AND ranked_members.duplicate_number > 1;--> statement-breakpoint

WITH ranked_members AS (
  SELECT
    "id",
    first_value("id") OVER (
      PARTITION BY "organization_id", "user_id"
      ORDER BY "created_at", "id"
    ) AS keeper_id,
    row_number() OVER (
      PARTITION BY "organization_id", "user_id"
      ORDER BY "created_at", "id"
    ) AS duplicate_number
  FROM "member"
)
UPDATE "bulk_send_jobs" j
SET "created_by_member_id" = ranked_members.keeper_id
FROM ranked_members
WHERE j."created_by_member_id" = ranked_members."id"
  AND ranked_members.duplicate_number > 1;--> statement-breakpoint

DELETE FROM "team_members" a
USING "team_members" b
WHERE a."team_id" = b."team_id"
  AND a."member_id" = b."member_id"
  AND a."id" > b."id";--> statement-breakpoint

DELETE FROM "signer_group_members" a
USING "signer_group_members" b
WHERE a."group_id" = b."group_id"
  AND a."signer_id" = b."signer_id"
  AND a."id" > b."id";--> statement-breakpoint

DELETE FROM "member" m
USING (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "organization_id", "user_id"
        ORDER BY "created_at", "id"
      ) AS duplicate_number
    FROM "member"
  ) ranked
  WHERE duplicate_number > 1
) duplicates
WHERE m."id" = duplicates."id";--> statement-breakpoint

DELETE FROM "signing_packet_values" v
USING (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "packet_id", "field_id"
        ORDER BY "updated_at" DESC, "id" DESC
      ) AS duplicate_number
    FROM "signing_packet_values"
    WHERE "copy_id" IS NULL
  ) ranked
  WHERE duplicate_number > 1
) duplicates
WHERE v."id" = duplicates."id";--> statement-breakpoint

DELETE FROM "signing_packet_values" v
USING (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "copy_id", "field_id"
        ORDER BY "updated_at" DESC, "id" DESC
      ) AS duplicate_number
    FROM "signing_packet_values"
    WHERE "copy_id" IS NOT NULL
  ) ranked
  WHERE duplicate_number > 1
) duplicates
WHERE v."id" = duplicates."id";--> statement-breakpoint

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_bulk_send_job_id_bulk_send_jobs_id_fk" FOREIGN KEY ("bulk_send_job_id") REFERENCES "public"."bulk_send_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_active_organization_id_organization_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_last_workspace_id_organization_id_fk" FOREIGN KEY ("last_workspace_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspace_id_organization_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD CONSTRAINT "signing_packet_copies_bulk_send_job_id_bulk_send_jobs_id_fk" FOREIGN KEY ("bulk_send_job_id") REFERENCES "public"."bulk_send_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD CONSTRAINT "signing_packet_copies_bulk_send_row_id_bulk_send_rows_id_fk" FOREIGN KEY ("bulk_send_row_id") REFERENCES "public"."bulk_send_rows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "audit_logs_organization_created_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_chain_created_idx" ON "audit_logs" USING btree ("chain_key","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_user_unique" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "bulk_send_jobs_organization_idx" ON "bulk_send_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bulk_send_jobs_document_idx" ON "bulk_send_jobs" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bulk_send_rows_job_row_unique" ON "bulk_send_rows" USING btree ("job_id","row_index");--> statement-breakpoint
CREATE INDEX "bulk_send_rows_packet_copy_idx" ON "bulk_send_rows" USING btree ("packet_copy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domains_hostname_unique" ON "custom_domains" USING btree ("hostname");--> statement-breakpoint
CREATE INDEX "custom_domains_organization_idx" ON "custom_domains" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "documents_workspace_idx" ON "documents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "documents_team_idx" ON "documents" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "fields_document_idx" ON "fields" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_branding_organization_unique" ON "organization_branding" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signer_group_members_group_signer_unique" ON "signer_group_members" USING btree ("group_id","signer_id");--> statement-breakpoint
CREATE INDEX "signer_groups_organization_idx" ON "signer_groups" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "signer_groups_team_idx" ON "signer_groups" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "signer_challenges_packet_role_idx" ON "signer_verification_challenges" USING btree ("packet_id","role_name");--> statement-breakpoint
CREATE INDEX "signer_challenges_copy_idx" ON "signer_verification_challenges" USING btree ("copy_id");--> statement-breakpoint
CREATE INDEX "signer_challenges_expires_idx" ON "signer_verification_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "signing_packet_copies_packet_idx" ON "signing_packet_copies" USING btree ("packet_id");--> statement-breakpoint
CREATE INDEX "signing_packet_copies_team_idx" ON "signing_packet_copies" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "signing_packet_copies_bulk_job_idx" ON "signing_packet_copies" USING btree ("bulk_send_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signing_packet_values_shared_field_unique" ON "signing_packet_values" USING btree ("packet_id","field_id") WHERE "signing_packet_values"."copy_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "signing_packet_values_copy_field_unique" ON "signing_packet_values" USING btree ("copy_id","field_id") WHERE "signing_packet_values"."copy_id" is not null;--> statement-breakpoint
CREATE INDEX "signing_packet_values_packet_idx" ON "signing_packet_values" USING btree ("packet_id");--> statement-breakpoint
CREATE INDEX "signing_packet_values_copy_idx" ON "signing_packet_values" USING btree ("copy_id");--> statement-breakpoint
CREATE INDEX "signing_packets_document_idx" ON "signing_packets" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "signing_packets_workspace_idx" ON "signing_packets" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_team_member_unique" ON "team_members" USING btree ("team_id","member_id");--> statement-breakpoint
CREATE INDEX "team_members_organization_idx" ON "team_members" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_organization_slug_unique" ON "teams" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "teams_organization_idx" ON "teams" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_signers_organization_email_unique" ON "workspace_signers" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "workspace_signers_team_idx" ON "workspace_signers" USING btree ("team_id");
