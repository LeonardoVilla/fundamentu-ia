CREATE TABLE `portfolio_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`import_id` integer NOT NULL,
	`ticker` text NOT NULL,
	`asset_type` text DEFAULT 'Ação' NOT NULL,
	`quantity` integer,
	`average_price` text,
	`institution` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portfolio_imports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`filename` text NOT NULL,
	`format` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
