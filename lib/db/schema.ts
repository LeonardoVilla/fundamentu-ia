import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const aiCredentials = sqliteTable("ai_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider", { enum: ["deepseek", "openai", "gemini", "claude"] }).notNull().unique(),
  apiKey: text("api_key").notNull(),
  model: text("model"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const aiProviderOrder = sqliteTable("ai_provider_order", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull().unique(),
  position: integer("position").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const riAgents = sqliteTable("ri_agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  provider: text("provider").notNull(),
  prompt: text("prompt").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const riSources = sqliteTable("ri_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull().unique(),
  assetType: text("asset_type").notNull().default("Ação"),
  sourceUrl: text("source_url").notNull(),
  sourceTitle: text("source_title"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const watchlist = sqliteTable("watchlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  ticker: text("ticker").notNull(),
  assetType: text("asset_type").notNull().default("Ação"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({ userTicker: uniqueIndex("watchlist_user_ticker_idx").on(table.userId, table.ticker) }));

export const riAnalyses = sqliteTable("ri_analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  ticker: text("ticker").notNull(),
  assetType: text("asset_type").notNull(),
  method: text("method").notNull().default("convergencia"),
  sourceUrl: text("source_url").notNull(),
  sourceTitle: text("source_title"),
  excerpt: text("excerpt"),
  status: text("status", { enum: ["collected", "analyzed", "failed"] }).notNull(),
  error: text("error"),
  summary: text("summary"),
  score: integer("score"),
  ruleScore: integer("rule_score"),
  findings: text("findings"),
  provider: text("provider"),
  metrics: text("metrics"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const riAgentRuns = sqliteTable("ri_agent_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  analysisId: integer("analysis_id").notNull(),
  agentName: text("agent_name").notNull(),
  role: text("role").notNull(),
  provider: text("provider").notNull(),
  output: text("output"),
  status: text("status", { enum: ["completed", "failed"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const portfolioImports = sqliteTable("portfolio_imports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  filename: text("filename").notNull(),
  format: text("format").notNull(),
  rowCount: integer("row_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const portfolioAssets = sqliteTable("portfolio_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  importId: integer("import_id").notNull(),
  ticker: text("ticker").notNull(),
  assetType: text("asset_type").notNull().default("Ação"),
  quantity: text("quantity"),
  averagePrice: text("average_price"),
  acquisitionDate: text("acquisition_date"),
  maturityDate: text("maturity_date"),
  acquisitionValue: text("acquisition_value"),
  currentValue: text("current_value"),
  institution: text("institution"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const taxDocuments = sqliteTable("tax_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  taxYear: integer("tax_year").notNull(),
  documentType: text("document_type").notNull().default("Outro"),
  filename: text("filename").notNull(),
  format: text("format").notNull(),
  size: integer("size").notNull().default(0),
  extractionStatus: text("extraction_status", { enum: ["pending", "extracted", "failed"] }).notNull().default("pending"),
  extractedText: text("extracted_text"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const taxTransactions = sqliteTable("tax_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  taxYear: integer("tax_year").notNull(),
  ticker: text("ticker").notNull(),
  assetType: text("asset_type").notNull().default("Ação"),
  operation: text("operation", { enum: ["compra", "venda"] }).notNull(),
  tradeDate: text("trade_date").notNull(),
  quantity: text("quantity").notNull(),
  unitPrice: text("unit_price").notNull(),
  fees: text("fees").default("0"),
  irrf: text("irrf").default("0"),
  sourceDocumentId: integer("source_document_id"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const taxIncome = sqliteTable("tax_income", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  taxYear: integer("tax_year").notNull(),
  ticker: text("ticker"),
  assetType: text("asset_type").notNull().default("Ação"),
  incomeType: text("income_type").notNull(),
  receivedDate: text("received_date").notNull(),
  grossAmount: text("gross_amount").notNull(),
  withholding: text("withholding").default("0"),
  sourceDocumentId: integer("source_document_id"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const riDocuments = sqliteTable("ri_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  analysisId: integer("analysis_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  documentType: text("document_type").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});
