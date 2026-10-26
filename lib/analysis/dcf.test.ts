import { describe, expect, it } from "vitest";
import { calculateDcf, dcfScenarios } from "./dcf";

const input = { freeCashFlow: 100, growthRate: 0.05, discountRate: 0.1, terminalGrowthRate: 0.02, years: 5, netDebt: 100, shares: 10 };

describe("DCF", () => {
  it("calcula valor por ação e fluxos projetados", () => {
    const result = calculateDcf(input);
    expect(result.projectedCashFlows).toHaveLength(5);
    expect(result.enterpriseValue).toBeGreaterThan(result.equityValue);
    expect(result.valuePerShare).toBeGreaterThan(0);
  });
  it("produz três cenários ordenados por valor", () => {
    const result = dcfScenarios(input);
    expect(result.conservador.valuePerShare).toBeLessThan(result.base.valuePerShare);
    expect(result.base.valuePerShare).toBeLessThan(result.otimista.valuePerShare);
  });
});
