PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`file_url` text NOT NULL,
	`workspace_id` text,
	`is_template` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT '"2026-05-20T13:28:46.500Z"' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_documents`("id", "name", "file_url", "workspace_id", "is_template", "created_at") SELECT "id", "name", "file_url", "workspace_id", "is_template", "created_at" FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`signer_name` text,
	`signer_email` text,
	`signer_ip` text,
	`signer_user_agent` text,
	`completed_at` integer,
	`created_at` integer DEFAULT '"2026-05-20T13:28:46.503Z"' NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "document_id", "status", "signer_name", "signer_email", "signer_ip", "signer_user_agent", "completed_at", "created_at") SELECT "id", "document_id", "status", "signer_name", "signer_email", "signer_ip", "signer_user_agent", "completed_at", "created_at" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
ALTER TABLE `fields` ADD `required` integer DEFAULT true NOT NULL;