import { describe, expect, it } from "vitest";
import { scoreMethod } from "./scoring";

describe("scoreMethod", () => {
  it("calcula uma leitura objetiva para Bazin", () => {
    const result = scoreMethod("bazin", [{ name: "Dividend yield", value: "7,2", evidence: "DY 7,2%" }]);
    expect(result.score).toBe(96);
    expect(result.findings[0].status).toBe("positivo");
  });
  it("calcula score de convergência com os indicadores disponíveis", () => {
    const result = scoreMethod("convergencia", [{ name: "Dividend yield", value: "7", evidence: "DY 7%" }, { name: "ROE", value: "18", evidence: "ROE 18%" }, { name: "P/L", value: "10", evidence: "P/L 10x" }]);
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(3);
  });
  it("marca indicador abaixo do critério como atenção", () => {
    const result = scoreMethod("convergencia", [{ name: "ROE", value: "8", evidence: "ROE 8%" }]);
    expect(result.score).toBe(45);
    expect(result.findings[0].status).toBe("atenção");
  });
  it("retorna insuficiente sem o indicador necessário", () => {
    const result = scoreMethod("graham", []);
    expect(result.score).toBeNull();
    expect(result.findings[0].status).toBe("insuficiente");
  });
  it("avalia qualidade e valor na Magic Formula", () => {
    const result = scoreMethod("magic-formula", [{ name: "ROIC", value: "18", evidence: "ROIC 18%" }, { name: "Earnings yield", value: "8", evidence: "Earnings yield 8%" }]);
    expect(result.score).toBe(100);
  });
});
