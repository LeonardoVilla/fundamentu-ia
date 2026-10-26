import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { portfolioAssets, portfolioImports } from "@/lib/db/schema";

function numberValue(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.replace(/[^\d,.-]/g, "").includes(",") ? value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".") : value.replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const importedRows = await db.select({ asset: portfolioAssets, import: portfolioImports }).from(portfolioAssets).leftJoin(portfolioImports, eq(portfolioAssets.importId, portfolioImports.id)).where(eq(portfolioAssets.userId, Number(session.user.id)));
  const fixedPdfTypes = ["CDB", "CRI", "LCD", "LCI", "LIG", "LC", "Renda Fixa"];
  const hasB3FixedIncome = importedRows.some(({ asset, import: source }) => source?.format !== "pdf" && ["Renda Fixa", "Tesouro Direto"].includes(asset.assetType));
  const excludedDuplicateRows = hasB3FixedIncome ? importedRows.filter(({ asset, import: source }) => source?.format === "pdf" && fixedPdfTypes.includes(asset.assetType)) : [];
  const assets = importedRows.filter(({ asset, import: source }) => !hasB3FixedIncome || source?.format !== "pdf" || !fixedPdfTypes.includes(asset.assetType)).map(({ asset }) => asset);
  const tickers = [...new Set(assets.map(asset => asset.ticker))].slice(0, 50);
  let invested = 0;
  let marketValue = 0;
  let valuedPositions = 0;
  const categories = new Map<string, { count: number; value: number }>();
  const institutions = new Map<string, { count: number; value: number }>();
  const products: Array<{ ticker: string; assetType: string; quantity: string | null; value: number; institution: string }> = [];
  for (const asset of assets) {
    const quantity = numberValue(asset.quantity);
    const averagePrice = numberValue(asset.averagePrice);
    if (quantity !== null && averagePrice !== null) invested += quantity * averagePrice;
    const currentValue = numberValue(asset.currentValue);
    const referenceValue = currentValue ?? (quantity !== null && averagePrice !== null ? quantity * averagePrice : 0);
    const value = referenceValue;
    if (value > 0) valuedPositions += 1;
    marketValue += value;
    const category = asset.assetType || "Outros";
    const institution = asset.institution || "Não informado";
    const categoryItem = categories.get(category) ?? { count: 0, value: 0 };
    categoryItem.count += 1; categoryItem.value += value; categories.set(category, categoryItem);
    const institutionItem = institutions.get(institution) ?? { count: 0, value: 0 };
    institutionItem.count += 1; institutionItem.value += value; institutions.set(institution, institutionItem);
    products.push({ ticker: asset.ticker, assetType: category, quantity: asset.quantity, value, institution });
  }
  const profitLoss = invested > 0 && valuedPositions > 0 ? marketValue - invested : null;
  const toBreakdown = (items: Map<string, { count: number; value: number }>) => [...items.entries()].map(([name, item]) => ({ name, ...item, percent: marketValue > 0 ? (item.value / marketValue) * 100 : 0 })).sort((a, b) => b.value - a.value);
  const excludedValue = excludedDuplicateRows.reduce((total, { asset }) => {
    const current = numberValue(asset.currentValue);
    const quantity = numberValue(asset.quantity);
    const average = numberValue(asset.averagePrice);
    return total + (current ?? (quantity !== null && average !== null ? quantity * average : 0));
  }, 0);
  return Response.json({ summary: { positions: assets.length, tickers: tickers.length, invested, marketValue, profitLoss, profitLossPercent: profitLoss === null || invested === 0 ? null : (profitLoss / invested) * 100, valuedPositions, categories: toBreakdown(categories), institutions: toBreakdown(institutions), products: products.sort((a, b) => b.value - a.value), reconciliation: excludedDuplicateRows.length ? { excludedPositions: excludedDuplicateRows.length, excludedValue, message: "O PDF de renda fixa foi mantido para consulta, mas não foi somado porque a planilha B3 já contém Renda Fixa/Tesouro Direto." } : null } });
}
