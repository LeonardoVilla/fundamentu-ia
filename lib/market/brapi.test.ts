import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchQuote } from "./brapi";

afterEach(() => vi.unstubAllGlobals());

describe("fetchQuote", () => {
  it("normaliza cotação e histórico", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ results: [{ symbol: "PETR4", regularMarketPrice: 38.42, regularMarketChangePercent: 1.84, regularMarketVolume: 1000, historicalDataPrice: [{ date: 1700000000, close: 37.2 }] }] }), { status: 200 })));
    const result = await fetchQuote("PETR4");
    expect(result.symbol).toBe("PETR4");
    expect(result.price).toBe(38.42);
    expect(result.history).toEqual([{ date: "2023-11-14T22:13:20.000Z", close: 37.2 }]);
  });

  it("retorna erro quando a fonte responde com falha", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limit", { status: 429 })));
    await expect(fetchQuote("PETR4")).rejects.toThrow("HTTP 429");
  });
});
