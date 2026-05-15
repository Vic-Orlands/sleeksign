CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`file_url` text NOT NULL,
	`created_at` integer DEFAULT '"2026-05-15T01:50:16.711Z"' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fields` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`type` text NOT NULL,
	`page` integer NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`width` integer DEFAULT 200 NOT NULL,
	`height` integer DEFAULT 50 NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`signer_name` text,
	`signer_email` text,
	`completed_at` integer,
	`created_at` integer DEFAULT '"2026-05-15T01:50:16.718Z"' NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`field_id` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `fields`(`id`) ON UPDATE no action ON DELETE cascade
);
