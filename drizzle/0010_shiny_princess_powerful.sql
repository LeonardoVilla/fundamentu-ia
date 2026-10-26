CREATE TABLE `ri_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`asset_type` text DEFAULT 'Ação' NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ri_sources_ticker_unique` ON `ri_sources` (`ticker`);