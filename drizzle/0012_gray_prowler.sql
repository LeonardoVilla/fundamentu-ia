DROP INDEX "ai_credentials_provider_unique";--> statement-breakpoint
DROP INDEX "ai_provider_order_provider_unique";--> statement-breakpoint
DROP INDEX "ri_sources_ticker_unique";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "watchlist_user_ticker_idx";--> statement-breakpoint
ALTER TABLE `portfolio_assets` ALTER COLUMN "quantity" TO "quantity" text;--> statement-breakpoint
CREATE UNIQUE INDEX `ai_credentials_provider_unique` ON `ai_credentials` (`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_provider_order_provider_unique` ON `ai_provider_order` (`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `ri_sources_ticker_unique` ON `ri_sources` (`ticker`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_user_ticker_idx` ON `watchlist` (`user_id`,`ticker`);