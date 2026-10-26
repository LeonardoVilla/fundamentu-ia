export const analysisMethods = [
  { id: "convergencia", label: "Convergência fundamentalista", description: "Combina sinais de valor, qualidade, crescimento e risco.", checks: ["Valor", "Qualidade", "Crescimento", "Risco"], assets: ["Ação", "FII", "Fiagro", "ETF"] },
  { id: "bazin", label: "Décio Bazin", description: "Dividend yield, preço-teto, consistência e endividamento.", checks: ["Dividend yield", "Preço-teto", "Dívida", "Proventos"], assets: ["Ação"] },
  { id: "graham", label: "Benjamin Graham", description: "Valor, liquidez, dívida, lucro e margem de segurança.", checks: ["P/L", "P/VP", "Liquidez", "Margem de segurança"], assets: ["Ação"] },
  { id: "buffett", label: "Buffett / Munger", description: "Qualidade do negócio, geração de caixa e vantagem competitiva.", checks: ["ROIC", "Fluxo de caixa", "Margens", "Vantagem competitiva"], assets: ["Ação"] },
  { id: "piotroski", label: "Piotroski F-Score", description: "Nove sinais contábeis de força financeira.", checks: ["Rentabilidade", "Alavancagem", "Liquidez", "Eficiência"], assets: ["Ação"] },
  { id: "magic-formula", label: "Magic Formula", description: "Earnings yield combinado com retorno sobre capital.", checks: ["Earnings yield", "ROIC", "Ranking", "Preço"], assets: ["Ação"] },
  { id: "dcf", label: "Fluxo de caixa descontado", description: "Valor intrínseco por cenários de fluxo de caixa.", checks: ["FCF", "WACC", "Crescimento", "Valor terminal"], assets: ["Ação"] },
  { id: "fundos", label: "FII / Fiagro", description: "Yield, P/VP, vacância, inadimplência e qualidade dos ativos.", checks: ["Yield", "P/VP", "Vacância", "Inadimplência"], assets: ["FII", "Fiagro"] },
  { id: "etf", label: "ETF", description: "Taxa, liquidez, composição e diferença de acompanhamento.", checks: ["Taxa", "Liquidez", "Composição", "Tracking difference"], assets: ["ETF"] },
] as const;

export type AnalysisMethodId = (typeof analysisMethods)[number]["id"];
export function methodLabel(id: string): string { return analysisMethods.find((method) => method.id === id)?.label ?? "Convergência fundamentalista"; }
