import { describe, expect, it } from "vitest";
import { extractDcfInputs, extractMetrics } from "./metrics";

describe("extractMetrics", () => {
  it("extrai indicadores conhecidos com evidência", () => {
    const metrics = extractMetrics("Dividend Yield: 7,2%. ROE: 18,4%. P/L 9,5x.");
    expect(metrics.map((metric) => metric.name)).toEqual(["Dividend yield", "ROE", "P/L"]);
    expect(metrics[0].value).toBe("7,2");
    expect(metrics[0].evidence).toContain("Dividend Yield");
  });

  it("não inventa métricas ausentes", () => {
    expect(extractMetrics("Relatório institucional sem indicadores numéricos.")).toEqual([]);
  });

  it("extrai entradas básicas para DCF", () => {
    expect(extractDcfInputs("Fluxo de caixa livre: R$ 1.250,5 milhões. Dívida líquida: R$ 400 milhões. Ações em circulação: 100 milhões.")).toEqual({ freeCashFlow: 1250.5, netDebt: 400, shares: 100 });
  });

  it("ignora números inválidos nas entradas do DCF", () => {
    expect(extractDcfInputs("Fluxo de caixa livre: não informado. Dívida líquida: —.")).toEqual({ freeCashFlow: undefined, netDebt: undefined, shares: undefined });
  });
});
