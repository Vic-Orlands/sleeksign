CREATE TABLE "document_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"team_id" text,
	"document_id" text NOT NULL,
	"artifact_type" text NOT NULL,
	"artifact_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source_document_hash" text NOT NULL,
	"finalized_document_hash" text NOT NULL,
	"manifest" text NOT NULL,
	"manifest_hash" text NOT NULL,
	"signature" text NOT NULL,
	"signature_algorithm" text NOT NULL,
	"key_version" text NOT NULL,
	"public_key_fingerprint" text NOT NULL,
	"audit_chain_key" text NOT NULL,
	"audit_root_hash" text NOT NULL,
	"audit_event_count" integer NOT NULL,
	"finalized_storage_key" text NOT NULL,
	"finalized_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "document_verifications" ADD CONSTRAINT "document_verifications_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_verifications" ADD CONSTRAINT "document_verifications_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_verifications" ADD CONSTRAINT "document_verifications_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "document_verifications_artifact_unique" ON "document_verifications" USING btree ("artifact_type","artifact_id");
--> statement-breakpoint
CREATE INDEX "document_verifications_document_idx" ON "document_verifications" USING btree ("document_id");
--> statement-breakpoint
CREATE INDEX "document_verifications_finalized_hash_idx" ON "document_verifications" USING btree ("finalized_document_hash");
--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "evidence_snapshot";
--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "certificate_id";
--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "certificate_hash";
--> statement-breakpoint
ALTER TABLE "signing_packet_copies" DROP COLUMN "evidence_snapshot";
--> statement-breakpoint
ALTER TABLE "signing_packet_copies" DROP COLUMN "certificate_id";
--> statement-breakpoint
ALTER TABLE "signing_packet_copies" DROP COLUMN "certificate_hash";
--> statement-breakpoint
ALTER TABLE "signing_packets" DROP COLUMN "evidence_snapshot";
--> statement-breakpoint
ALTER TABLE "signing_packets" DROP COLUMN "certificate_id";
--> statement-breakpoint
ALTER TABLE "signing_packets" DROP COLUMN "certificate_hash";
