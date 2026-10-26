import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./demo.db",
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});

async function execute(sql, args = []) {
  await client.execute({ sql, args });
}

await client.batch([
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT, image TEXT, role TEXT NOT NULL DEFAULT 'user', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS ri_sources (id INTEGER PRIMARY KEY AUTOINCREMENT, ticker TEXT NOT NULL UNIQUE, asset_type TEXT NOT NULL DEFAULT 'Ação', source_url TEXT NOT NULL, source_title TEXT, updated_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS watchlist (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, ticker TEXT NOT NULL, asset_type TEXT NOT NULL DEFAULT 'Ação', created_at INTEGER NOT NULL, UNIQUE(user_id, ticker))",
  "CREATE TABLE IF NOT EXISTS portfolio_imports (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, filename TEXT NOT NULL, format TEXT NOT NULL, row_count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS portfolio_assets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, import_id INTEGER NOT NULL, ticker TEXT NOT NULL, asset_type TEXT NOT NULL DEFAULT 'Ação', quantity TEXT, average_price TEXT, acquisition_date TEXT, maturity_date TEXT, acquisition_value TEXT, current_value TEXT, institution TEXT, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS ri_analyses (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, ticker TEXT NOT NULL, asset_type TEXT NOT NULL, method TEXT NOT NULL DEFAULT 'convergencia', source_url TEXT NOT NULL, source_title TEXT, excerpt TEXT, status TEXT NOT NULL, error TEXT, summary TEXT, score INTEGER, rule_score INTEGER, findings TEXT, provider TEXT, metrics TEXT, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS ri_agent_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, analysis_id INTEGER NOT NULL, agent_name TEXT NOT NULL, role TEXT NOT NULL, provider TEXT NOT NULL, output TEXT, status TEXT NOT NULL, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS ri_documents (id INTEGER PRIMARY KEY AUTOINCREMENT, analysis_id INTEGER NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, document_type TEXT NOT NULL, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS ri_agents (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL, provider TEXT NOT NULL, prompt TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS ai_provider_order (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL UNIQUE, position INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS ai_credentials (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL UNIQUE, api_key TEXT NOT NULL, model TEXT, enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS tax_documents (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, tax_year INTEGER NOT NULL, document_type TEXT NOT NULL DEFAULT 'Outro', filename TEXT NOT NULL, format TEXT NOT NULL, size INTEGER NOT NULL DEFAULT 0, extraction_status TEXT NOT NULL DEFAULT 'pending', extracted_text TEXT, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS tax_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, tax_year INTEGER NOT NULL, ticker TEXT NOT NULL, asset_type TEXT NOT NULL DEFAULT 'Ação', operation TEXT NOT NULL, trade_date TEXT NOT NULL, quantity TEXT NOT NULL, unit_price TEXT NOT NULL, fees TEXT DEFAULT '0', irrf TEXT DEFAULT '0', source_document_id INTEGER, notes TEXT, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS tax_income (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, tax_year INTEGER NOT NULL, ticker TEXT, asset_type TEXT NOT NULL DEFAULT 'Ação', income_type TEXT NOT NULL, received_date TEXT NOT NULL, gross_amount TEXT NOT NULL, withholding TEXT DEFAULT '0', source_document_id INTEGER, notes TEXT, created_at INTEGER NOT NULL)",
].map(sql => ({ sql, args: [] })));

await client.batch([
  "DELETE FROM ri_agent_runs",
  "DELETE FROM ri_documents",
  "DELETE FROM ri_analyses",
  "DELETE FROM ri_sources",
  "DELETE FROM watchlist",
  "DELETE FROM portfolio_assets",
  "DELETE FROM portfolio_imports",
  "DELETE FROM tax_income",
  "DELETE FROM tax_transactions",
  "DELETE FROM tax_documents",
  "DELETE FROM ai_provider_order",
  "DELETE FROM ri_agents",
  "DELETE FROM users",
].map(sql => ({ sql, args: [] })));

await execute("INSERT INTO users (id, email, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [1, "demo@fundamentu.ia", "Leonardo Villa", "admin", Date.now(), Date.now()]);

await execute("INSERT INTO ri_sources (ticker, asset_type, source_url, source_title, updated_at) VALUES (?, ?, ?, ?, ?)", ["PETR4", "Ação", "https://petrobras.com.br/ri", "Petrobras — Relações com Investidores", Date.now()]);
for (const ticker of ["PETR4", "VALE3", "ITUB4"]) {
  await execute("INSERT INTO watchlist (user_id, ticker, asset_type, created_at) VALUES (?, ?, ?, ?)", [1, ticker, "Ação", Date.now()]);
}

await execute("INSERT INTO portfolio_imports (id, user_id, filename, format, row_count, created_at) VALUES (?, ?, ?, ?, ?, ?)", [1, 1, "demo-carteira-b3.xlsx", "xlsx", 8, Date.now()]);
const assets = [
  ["PETR4", "Ação", "100", "37.50", "Petrobras", "3750.00"],
  ["VALE3", "Ação", "50", "62.40", "Vale", "3120.00"],
  ["ITUB4", "Ação", "100", "34.00", "Itaú Unibanco", "3400.00"],
  ["MXRF11", "FII", "200", "10.48", "BTG Pactual", "2096.00"],
  ["BOVA11", "ETF", "10", "125.00", "Itaú Unibanco", "1250.00"],
  ["CDB-DEMO", "Renda Fixa", "1", "12500.00", "Banco Inter", "12500.00"],
  ["TESOURO-DEMO", "Tesouro Direto", "1", "28085.20", "Tesouro Nacional", "28085.20"],
  ["PREVIDENCIA", "Previdência Privada", "1", "22096.99", "Brasilprev", "22096.99"],
];
for (const [ticker, assetType, quantity, averagePrice, institution, currentValue] of assets) {
  await execute("INSERT INTO portfolio_assets (user_id, import_id, ticker, asset_type, quantity, average_price, current_value, institution, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [1, 1, ticker, assetType, quantity, averagePrice, currentValue, institution, Date.now()]);
}

const metrics = JSON.stringify([
  { name: "ROE", value: "24,8", evidence: "Demonstração de resultado", source: "ri", sourceLabel: "RI" },
  { name: "ROIC", value: "18,4", evidence: "Indicadores operacionais", source: "ri", sourceLabel: "RI" },
  { name: "P/L", value: "7,9", evidence: "Múltiplo de mercado", source: "publica", sourceLabel: "Fonte pública" },
  { name: "Dívida líquida / EBITDA", value: "1,7", evidence: "Endividamento controlado", source: "ri", sourceLabel: "RI" },
]);
const findings = JSON.stringify([
  { label: "Rentabilidade", status: "positivo" },
  { label: "Valuation", status: "positivo" },
  { label: "Endividamento", status: "positivo" },
  { label: "Crescimento", status: "atenção" },
]);
await execute("INSERT INTO ri_analyses (id, user_id, ticker, asset_type, method, source_url, source_title, excerpt, status, summary, score, rule_score, findings, provider, metrics, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [1, 1, "PETR4", "Ação", "convergencia", "https://petrobras.com.br/ri", "Petrobras — Relações com Investidores", "Demonstração de análise para o ambiente de portfólio.", "analyzed", "A tese combina rentabilidade elevada, valuation moderado e endividamento sob controle. O principal ponto de atenção é a sensibilidade ao ciclo de commodities.", 82, 78, findings, "Demo IA", metrics, Date.now()]);
for (const [agentName, role, output] of [["Agente de documentos", "Coleta", "Documentos oficiais identificados no RI."], ["Agente de comunicados", "Eventos", "Não foram encontrados eventos negativos recentes na amostra."], ["Agente de síntese", "Síntese", "Convergência positiva com atenção ao ciclo de commodities."]]) {
  await execute("INSERT INTO ri_agent_runs (analysis_id, agent_name, role, provider, output, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [1, agentName, role, "Demo IA", output, "completed", Date.now()]);
}
await execute("INSERT INTO ri_documents (analysis_id, title, url, document_type, created_at) VALUES (?, ?, ?, ?, ?)", [1, "Resultados trimestrais — demonstração", "https://petrobras.com.br/ri", "ITR", Date.now()]);
await execute("INSERT INTO ri_documents (analysis_id, title, url, document_type, created_at) VALUES (?, ?, ?, ?, ?)", [1, "Apresentação de resultados — demonstração", "https://petrobras.com.br/ri", "Apresentação", Date.now()]);

await execute("INSERT INTO ri_agents (id, name, role, provider, prompt, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [1, "Agente de documentos", "Coleta", "deepseek", "Extraia documentos e evidências do RI.", 1, Date.now(), Date.now()]);
await execute("INSERT INTO ri_agents (id, name, role, provider, prompt, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [2, "Agente de síntese", "Síntese", "openai", "Resuma a tese com riscos e pontos positivos.", 1, Date.now(), Date.now()]);
for (const [position, provider] of [[1, "deepseek"], [2, "openai"], [3, "gemini"], [4, "claude"]]) {
  await execute("INSERT INTO ai_provider_order (provider, position, enabled, updated_at) VALUES (?, ?, ?, ?)", [provider, position, 1, Date.now()]);
}

await execute("INSERT INTO tax_documents (user_id, tax_year, document_type, filename, format, size, extraction_status, extracted_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [1, 2026, "Informe de rendimentos", "demo-informe-rendimentos.pdf", "pdf", 128000, "extracted", "Documento demonstrativo para o ambiente de portfólio.", Date.now()]);
await execute("INSERT INTO tax_transactions (user_id, tax_year, ticker, asset_type, operation, trade_date, quantity, unit_price, fees, irrf, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [1, 2026, "PETR4", "Ação", "compra", "2026-03-15", "100", "37.50", "12.50", "0", "Lote demonstrativo", Date.now()]);
await execute("INSERT INTO tax_income (user_id, tax_year, ticker, asset_type, income_type, received_date, gross_amount, withholding, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [1, 2026, "MXRF11", "FII", "Rendimento", "2026-10-15", "42.00", "0", "Rendimento demonstrativo", Date.now()]);

console.log("Base demo criada e populada: demo@fundamentu.ia");
await client.close();
