import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { portfolioAssets, taxIncome, taxTransactions } from "@/lib/db/schema";

function hasValue(value: string | null) { return value !== null && value.trim() !== "" && value !== "0"; }
function numberValue(value: string | null): number { if (!value) return 0; const normalized = value.replace(/[^\d,.-]/g, "").includes(",") ? value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".") : value.replace(/[^\d.-]/g, ""); const parsed = Number(normalized); return Number.isFinite(parsed) ? parsed : 0; }

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const assets = await db.select().from(portfolioAssets).where(eq(portfolioAssets.userId, Number(session.user.id)));
  const taxYear = new Date().getFullYear();
  const [transactions, income] = await Promise.all([
    db.select({ id: taxTransactions.id }).from(taxTransactions).where(and(eq(taxTransactions.userId, Number(session.user.id)), eq(taxTransactions.taxYear, taxYear))),
    db.select({ id: taxIncome.id }).from(taxIncome).where(and(eq(taxIncome.userId, Number(session.user.id)), eq(taxIncome.taxYear, taxYear))),
  ]);
  const missingCostBasis = assets.filter(asset => !hasValue(asset.averagePrice));
  const categories = [...new Set(assets.map(asset => asset.assetType))];
  const patrimony = assets.map(asset => ({ ticker: asset.ticker, assetType: asset.assetType, quantity: asset.quantity, institution: asset.institution || "Não informado", acquisitionDate: asset.acquisitionDate, maturityDate: asset.maturityDate, acquisitionValue: numberValue(asset.acquisitionValue), referenceUnitPrice: numberValue(asset.averagePrice), needsReview: !hasValue(asset.averagePrice) }));
  return Response.json({
    taxYear,
    assets: assets.length,
    categories,
    patrimony,
    checklist: [
      { id: "portfolio", label: "Carteira de posições importada", status: assets.length > 0 ? "complete" : "pending", detail: assets.length > 0 ? `${assets.length} posições encontradas` : "Importe o relatório da B3" },
      { id: "cost-basis", label: "Preço médio de aquisição conferido", status: assets.length > 0 && missingCostBasis.length === 0 ? "complete" : "pending", detail: missingCostBasis.length ? `${missingCostBasis.length} posições sem custo de aquisição confirmado` : "Todos os ativos possuem valor de referência" },
      { id: "trades", label: "Compras e vendas do ano", status: transactions.length > 0 ? "complete" : "pending", detail: transactions.length > 0 ? `${transactions.length} operações registradas` : "Importe notas de corretagem ou um extrato de operações" },
      { id: "income", label: "Dividendos, JCP e rendimentos", status: income.length > 0 ? "complete" : "pending", detail: income.length > 0 ? `${income.length} rendimentos registrados` : "Adicione informes de rendimentos das instituições" },
      { id: "variable-income", label: "Apuração mensal de renda variável", status: transactions.length > 0 && categories.some(category => ["Ação", "FII", "Fiagro", "ETF", "BDR"].includes(category)) ? "pending" : "not-applicable", detail: "Ainda precisa conferir operações, taxas e IRRF por mês" },
      { id: "review", label: "Conferência com a pré-preenchida", status: "pending", detail: "Etapa final, sempre revisada pelo contribuinte" },
    ],
    sources: ["Posição importada da B3", "Dados públicos de mercado"],
  });
}
