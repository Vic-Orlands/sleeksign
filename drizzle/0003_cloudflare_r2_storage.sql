ALTER TABLE "documents" ADD COLUMN "storage_key" text;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "storage_provider" text DEFAULT 'r2' NOT NULL;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "upload_status" text DEFAULT 'ready' NOT NULL;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_size" integer;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "content_type" text;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "finalized_storage_key" text;
--> statement-breakpoint
ALTER TABLE "signing_packets" ADD COLUMN "finalized_storage_key" text;
--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD COLUMN "finalized_storage_key" text;
