CREATE TABLE "workspace_signers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"team_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"title" text,
	"type" text DEFAULT 'internal' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signer_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"team_id" text,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signer_group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"signer_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD COLUMN "recipient_type" text DEFAULT 'email';
--> statement-breakpoint
ALTER TABLE "signing_packet_copies" ADD COLUMN "recipient_source_id" text;
--> statement-breakpoint
ALTER TABLE "workspace_signers" ADD CONSTRAINT "workspace_signers_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_signers" ADD CONSTRAINT "workspace_signers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "signer_groups" ADD CONSTRAINT "signer_groups_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "signer_groups" ADD CONSTRAINT "signer_groups_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "signer_group_members" ADD CONSTRAINT "signer_group_members_group_id_signer_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."signer_groups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "signer_group_members" ADD CONSTRAINT "signer_group_members_signer_id_workspace_signers_id_fk" FOREIGN KEY ("signer_id") REFERENCES "public"."workspace_signers"("id") ON DELETE cascade ON UPDATE no action;
