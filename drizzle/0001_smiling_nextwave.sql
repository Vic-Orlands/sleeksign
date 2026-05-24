CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"team_id" text,
	"workspace_id" text,
	"document_id" text,
	"packet_id" text,
	"packet_copy_id" text,
	"session_id" text,
	"bulk_send_job_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"actor_email" text,
	"event_type" text NOT NULL,
	"chain_key" text NOT NULL,
	"request_id" text,
	"ip_address" text,
	"user_agent" text,
	"payload" text DEFAULT '{}' NOT NULL,
	"event_hash" text NOT NULL,
	"previous_event_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_send_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"team_id" text,
	"document_id" text NOT NULL,
	"packet_id" text,
	"mode" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"role_name" text,
	"csv_file_name" text NOT NULL,
	"mapping" text DEFAULT '{}' NOT NULL,
	"send_immediately" boolean DEFAULT false NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"viewed_count" integer DEFAULT 0 NOT NULL,
	"signed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by_member_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_send_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"packet_copy_id" text,
	"row_index" integer NOT NULL,
	"role_name" text NOT NULL,
	"signer_name" text,
	"signer_email" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"share_url" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"domain" text NOT NULL,
	"hostname" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"verification_token" text NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_role_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"member_id" text NOT NULL,
	"role_id" text NOT NULL,
	"team_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_branding" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#18181b' NOT NULL,
	"secondary_color" text DEFAULT '#f97316' NOT NULL,
	"neutral_color" text DEFAULT '#f7f5f1' NOT NULL,
	"accent_color" text DEFAULT '#ea580c' NOT NULL,
	"body_font" text DEFAULT 'Roboto' NOT NULL,
	"signature_font" text DEFAULT 'Ruthie' NOT NULL,
	"sender_name" text DEFAULT 'SleekSign' NOT NULL,
	"support_email" text,
	"support_label" text DEFAULT 'Support' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"team_id" text,
	"scope" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_key" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipient_import_errors" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"column_name" text,
	"message" text NOT NULL,
	"raw_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signer_verification_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"team_id" text,
	"document_id" text,
	"packet_id" text,
	"copy_id" text,
	"session_id" text,
	"role_name" text,
	"recipient_email" text NOT NULL,
	"code_hash" text NOT NULL,
	"verification_token" text,
	"expires_at" timestamp NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_sent_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"team_id" text NOT NULL,
	"member_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fields" ALTER COLUMN "assignee_role" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "require_otp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "verification_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "verification_mode" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "evidence_snapshot" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "certificate_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "certificate_hash" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "finalized_file_url" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD COLUMN "evidence_snapshot" text;--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD COLUMN "certificate_id" text;--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD COLUMN "certificate_hash" text;--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD COLUMN "bulk_send_job_id" text;--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD COLUMN "bulk_send_row_id" text;--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD COLUMN "require_otp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD COLUMN "verification_mode" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD COLUMN "evidence_snapshot" text;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD COLUMN "certificate_id" text;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD COLUMN "certificate_hash" text;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "signing_packets" AS "sp"
SET "workspace_id" = "d"."workspace_id"
FROM "documents" AS "d"
WHERE "sp"."document_id" = "d"."id";--> statement-breakpoint
ALTER TABLE "signing_packets" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_packet_id_signing_packets_id_fk" FOREIGN KEY ("packet_id") REFERENCES "public"."signing_packets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_packet_copy_id_signing_packet_copies_id_fk" FOREIGN KEY ("packet_copy_id") REFERENCES "public"."signing_packet_copies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_send_jobs" ADD CONSTRAINT "bulk_send_jobs_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_send_jobs" ADD CONSTRAINT "bulk_send_jobs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_send_jobs" ADD CONSTRAINT "bulk_send_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_send_jobs" ADD CONSTRAINT "bulk_send_jobs_packet_id_signing_packets_id_fk" FOREIGN KEY ("packet_id") REFERENCES "public"."signing_packets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_send_jobs" ADD CONSTRAINT "bulk_send_jobs_created_by_member_id_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_send_rows" ADD CONSTRAINT "bulk_send_rows_job_id_bulk_send_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."bulk_send_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_send_rows" ADD CONSTRAINT "bulk_send_rows_packet_copy_id_signing_packet_copies_id_fk" FOREIGN KEY ("packet_copy_id") REFERENCES "public"."signing_packet_copies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_role_assignments" ADD CONSTRAINT "member_role_assignments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_role_assignments" ADD CONSTRAINT "member_role_assignments_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_role_assignments" ADD CONSTRAINT "member_role_assignments_role_id_permission_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."permission_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_role_assignments" ADD CONSTRAINT "member_role_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_branding" ADD CONSTRAINT "organization_branding_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_role_permissions" ADD CONSTRAINT "permission_role_permissions_role_id_permission_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."permission_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_roles" ADD CONSTRAINT "permission_roles_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_roles" ADD CONSTRAINT "permission_roles_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient_import_errors" ADD CONSTRAINT "recipient_import_errors_job_id_bulk_send_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."bulk_send_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signer_verification_challenges" ADD CONSTRAINT "signer_verification_challenges_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signer_verification_challenges" ADD CONSTRAINT "signer_verification_challenges_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signer_verification_challenges" ADD CONSTRAINT "signer_verification_challenges_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signer_verification_challenges" ADD CONSTRAINT "signer_verification_challenges_packet_id_signing_packets_id_fk" FOREIGN KEY ("packet_id") REFERENCES "public"."signing_packets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signer_verification_challenges" ADD CONSTRAINT "signer_verification_challenges_copy_id_signing_packet_copies_id_fk" FOREIGN KEY ("copy_id") REFERENCES "public"."signing_packet_copies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signer_verification_challenges" ADD CONSTRAINT "signer_verification_challenges_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD CONSTRAINT "signing_packet_copies_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD CONSTRAINT "signing_packets_workspace_id_organization_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signing_packets" ADD CONSTRAINT "signing_packets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
