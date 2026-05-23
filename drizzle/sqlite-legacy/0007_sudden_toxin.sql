ALTER TABLE `documents` ADD `archived_at` integer;
ALTER TABLE `documents` ADD `deleted_at` integer;
ALTER TABLE `sessions` ADD `deleted_at` integer;
