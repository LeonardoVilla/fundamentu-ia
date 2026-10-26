CREATE TABLE `ri_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`ticker` text NOT NULL,
	`asset_type` text NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text,
	`excerpt` text,
	`status` text NOT NULL,
	`error` text,
	`created_at` integer NOT NULL
);
