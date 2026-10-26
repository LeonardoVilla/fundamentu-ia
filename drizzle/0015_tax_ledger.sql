CREATE TABLE `tax_transactions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL,
  `tax_year` integer NOT NULL,
  `ticker` text NOT NULL,
  `asset_type` text DEFAULT 'Ação' NOT NULL,
  `operation` text NOT NULL,
  `trade_date` text NOT NULL,
  `quantity` text NOT NULL,
  `unit_price` text NOT NULL,
  `fees` text DEFAULT '0',
  `irrf` text DEFAULT '0',
  `source_document_id` integer,
  `notes` text,
  `created_at` integer NOT NULL
);
CREATE TABLE `tax_income` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL,
  `tax_year` integer NOT NULL,
  `ticker` text,
  `asset_type` text DEFAULT 'Ação' NOT NULL,
  `income_type` text NOT NULL,
  `received_date` text NOT NULL,
  `gross_amount` text NOT NULL,
  `withholding` text DEFAULT '0',
  `source_document_id` integer,
  `notes` text,
  `created_at` integer NOT NULL
);
