CREATE TABLE `signing_packet_copies` (
	`id` text PRIMARY KEY NOT NULL,
	`packet_id` text NOT NULL,
	`role_name` text NOT NULL,
	`signer_name` text,
	`signer_email` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`finalized_file_url` text,
	`completed_at` integer,
	`created_at` integer DEFAULT '"2026-05-22T14:49:15.301Z"' NOT NULL,
	FOREIGN KEY (`packet_id`) REFERENCES `signing_packets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `signing_packet_values` (
	`id` text PRIMARY KEY NOT NULL,
	`packet_id` text NOT NULL,
	`copy_id` text,
	`field_id` text NOT NULL,
	`role_name` text NOT NULL,
	`value` text NOT NULL,
	`signer_name` text,
	`signer_email` text,
	`completed_at` integer,
	`created_at` integer DEFAULT '"2026-05-22T14:49:15.301Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-05-22T14:49:15.301Z"' NOT NULL,
	FOREIGN KEY (`packet_id`) REFERENCES `signing_packets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`copy_id`) REFERENCES `signing_packet_copies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `signing_packets` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`mode` text NOT NULL,
	`role_configs` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`finalized_file_url` text,
	`completed_at` integer,
	`created_at` integer DEFAULT '"2026-05-22T14:49:15.301Z"' NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `documents` ADD `role_configs` text DEFAULT '[{"name":"HR","scope":"private"},{"name":"Employee","scope":"private"},{"name":"Contractor","scope":"private"}]' NOT NULL;
