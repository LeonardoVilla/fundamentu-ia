import type { ExtractedMetric } from "@/lib/analysis/metrics";

type CapitalAgoraResponse = {
  data?: string;
  balanco_referencia?: string;
  indicadores?: Record<string, unknown>;
};

const API_BASE = "https://capitalagora.com.br/api/ativo";

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function fetchPublicFundamentals(ticker: string): Promise<ExtractedMetric[]> {
  const sourceUrl = `${API_BASE}/${encodeURIComponent(ticker)}`;
  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": "fundamentu-ia/0.1 (public fundamentals fallback)" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 900 },
  });
  if (!response.ok) throw new Error(`Fonte pública respondeu com HTTP ${response.status}.`);

  const payload = await response.json() as CapitalAgoraResponse;
  const indicators = payload.indicadores ?? {};
  const referenceDate = payload.balanco_referencia ?? payload.data;
  const sourceLabel = "Capital Agora (B3/CVM)";
  const values: Array<[string, unknown, string]> = [
    ["P/L", indicators.pl, "P/L"],
    ["P/VP", indicators.pvp, "P/VP"],
    ["ROE", indicators.roe, "ROE"],
    ["Margem líquida", indicators.margem_liquida, "Margem líquida"],
    ["Dividend yield", indicators.dy_12m ?? indicators.dy12m, "Dividend yield"],
    ["Dívida líquida", indicators.divida_liquida, "Dívida líquida"],
  ];

  return values.flatMap(([name, rawValue, label]) => {
    const value = asNumber(rawValue);
    if (value === undefined) return [];
    return [{
      name,
      value: String(value),
      evidence: `${label}: ${value}${name.includes("yield") || name.includes("ROE") || name.includes("Margem") ? "%" : ""} — fonte pública complementar Capital Agora${referenceDate ? `, referência ${referenceDate}` : ""}.`,
      source: "publica" as const,
      sourceLabel,
      sourceUrl,
      referenceDate,
    }];
  });
}

export function mergeMetrics(riMetrics: ExtractedMetric[], publicMetrics: ExtractedMetric[]): ExtractedMetric[] {
  const names = new Set(riMetrics.map((metric) => metric.name));
  return [...riMetrics, ...publicMetrics.filter((metric) => !names.has(metric.name))];
}
