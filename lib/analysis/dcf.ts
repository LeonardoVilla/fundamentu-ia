export type DcfInput = { freeCashFlow: number; growthRate: number; discountRate: number; terminalGrowthRate: number; years: number; netDebt: number; shares: number };
export type DcfResult = { enterpriseValue: number; equityValue: number; valuePerShare: number; projectedCashFlows: number[]; terminalValue: number };

export function calculateDcf(input: DcfInput): DcfResult {
  if (input.shares <= 0 || input.discountRate <= input.terminalGrowthRate || input.years < 1) throw new Error("Parâmetros de DCF inválidos.");
  let cashFlow = input.freeCashFlow;
  let presentValue = 0;
  const projectedCashFlows: number[] = [];
  for (let year = 1; year <= input.years; year += 1) {
    cashFlow *= 1 + input.growthRate;
    projectedCashFlows.push(cashFlow);
    presentValue += cashFlow / (1 + input.discountRate) ** year;
  }
  const terminalValue = (cashFlow * (1 + input.terminalGrowthRate)) / (input.discountRate - input.terminalGrowthRate);
  const enterpriseValue = presentValue + terminalValue / (1 + input.discountRate) ** input.years;
  const equityValue = enterpriseValue - input.netDebt;
  return { enterpriseValue, equityValue, valuePerShare: equityValue / input.shares, projectedCashFlows, terminalValue };
}

export function dcfScenarios(input: DcfInput): Record<"conservador" | "base" | "otimista", DcfResult> {
  return {
    conservador: calculateDcf({ ...input, growthRate: input.growthRate - 0.02, discountRate: input.discountRate + 0.01 }),
    base: calculateDcf(input),
    otimista: calculateDcf({ ...input, growthRate: input.growthRate + 0.02, discountRate: Math.max(input.terminalGrowthRate + 0.01, input.discountRate - 0.01) }),
  };
}
