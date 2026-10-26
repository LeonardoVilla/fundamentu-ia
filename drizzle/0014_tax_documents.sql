CREATE TABLE `tax_documents` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL,
  `tax_year` integer NOT NULL,
  `document_type` text DEFAULT 'Outro' NOT NULL,
  `filename` text NOT NULL,
  `format` text NOT NULL,
  `size` integer DEFAULT 0 NOT NULL,
  `extraction_status` text DEFAULT 'pending' NOT NULL,
  `extracted_text` text,
  `created_at` integer NOT NULL
);
