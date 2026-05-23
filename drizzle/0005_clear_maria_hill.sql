ALTER TABLE `documents` ADD `signer_roles` text DEFAULT '["HR","Employee","Contractor"]' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `signer_role` text;--> statement-breakpoint
ALTER TABLE `fields` ADD `assignee_role` text DEFAULT 'HR' NOT NULL;
