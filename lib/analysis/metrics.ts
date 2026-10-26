export type ExtractedMetric = {
  name: string;
  value: string;
  evidence: string;
  source?: "ri" | "publica";
  sourceLabel?: string;
  sourceUrl?: string;
  referenceDate?: string;
};
export type ExtractedDcfInputs = { freeCashFlow?: number; netDebt?: number; shares?: number };

const patterns: Array<{ name: string; regex: RegExp }> = [
  { name: "Dividend yield", regex: /(?:dividend\s*yield|dy)\s*[:=]?\s*(\d+[,.]?\d*)\s*%/i },
  { name: "ROE", regex: /(?:roe|retorno sobre o patrim[oô]nio)\s*[:=]?\s*(\d+[,.]?\d*)\s*%/i },
  { name: "ROIC", regex: /(?:roic|retorno sobre o capital)\s*[:=]?\s*(\d+[,.]?\d*)\s*%/i },
  { name: "Margem líquida", regex: /(?:margem l[ií]quida)\s*[:=]?\s*(\d+[,.]?\d*)\s*%/i },
  { name: "P/L", regex: /(?:p\/l|pl|pre[cç]o\/lucro)\s*[:=]?\s*(\d+[,.]?\d*)\s*x?/i },
  { name: "P/VP", regex: /(?:p\/vp|pvp|pre[cç]o\/valor patrimonial)\s*[:=]?\s*(\d+[,.]?\d*)\s*x?/i },
  { name: "Dívida líquida / EBITDA", regex: /(?:d[ií]vida l[ií]quida\s*\/\s*ebitda|alavancagem)\s*[:=]?\s*(\d+[,.]?\d*)\s*x?/i },
  { name: "Earnings yield", regex: /(?:earnings\s*yield|yield\s*de\s*lucro)\s*[:=]?\s*(\d+[,.]?\d*)\s*%/i },
  { name: "Vacância", regex: /(?:vac[aâ]ncia)\s*[:=]?\s*(\d+[,.]?\d*)\s*%/i },
  { name: "Inadimplência", regex: /(?:inadimpl[eê]ncia)\s*[:=]?\s*(\d+[,.]?\d*)\s*%/i },
  { name: "Taxa de administração", regex: /(?:taxa\s*de\s*administra[cç][aã]o)\s*[:=]?\s*(\d+[,.]?\d*)\s*%/i },
  { name: "Tracking difference", regex: /(?:tracking\s*difference|diferen[cç]a\s*de\s*acompanhamento)\s*[:=]?\s*(\d+[,.]?\d*)\s*%/i },
];

export function extractMetrics(text: string): ExtractedMetric[] {
  return patterns.flatMap(({ name, regex }) => {
    const match = text.match(regex);
    if (!match) return [];
    const index = Math.max(0, (match.index ?? 0) - 70);
    return [{ name, value: match[1], evidence: text.slice(index, Math.min(text.length, index + 180)).trim() }];
  });
}

function parseNumber(value: string): number {
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
  return Number(normalized);
}

function extractNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (!match) return undefined;
  const value = parseNumber(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

export function extractDcfInputs(text: string): ExtractedDcfInputs {
  return {
    freeCashFlow: extractNumber(text, /(?:fluxo de caixa livre|free cash flow|fcf)[^\d]{0,35}(?:r\$\s*)?([\d.,]+)/i),
    netDebt: extractNumber(text, /(?:d[ií]vida l[ií]quida|net debt)[^\d]{0,35}(?:r\$\s*)?([\d.,]+)/i),
    shares: extractNumber(text, /(?:a[cç][oõ]es em circula[cç][aã]o|n[uú]mero de a[cç][oõ]es|shares outstanding)[^\d]{0,35}([\d.,]+)/i),
  };
}
