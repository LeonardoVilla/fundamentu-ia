import { describe, expect, it } from "vitest";
import { analysisMethods, methodLabel } from "./methods";

describe("analysis methods", () => {
  it("mantém métodos específicos por tipo de ativo", () => {
    expect(analysisMethods.find((method) => method.id === "fundos")?.assets).toEqual(["FII", "Fiagro"]);
    expect(analysisMethods.find((method) => method.id === "etf")?.assets).toEqual(["ETF"]);
  });

  it("usa um rótulo seguro para métodos desconhecidos", () => {
    expect(methodLabel("nao-existe")).toBe("Convergência fundamentalista");
  });
});
