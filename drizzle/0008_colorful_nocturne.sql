CREATE TABLE `ri_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`analysis_id` integer NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`document_type` text NOT NULL,
	`created_at` integer NOT NULL
);
