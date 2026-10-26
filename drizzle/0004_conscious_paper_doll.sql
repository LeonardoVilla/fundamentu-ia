CREATE TABLE `ri_agent_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`analysis_id` integer NOT NULL,
	`agent_name` text NOT NULL,
	`role` text NOT NULL,
	`provider` text NOT NULL,
	`output` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
