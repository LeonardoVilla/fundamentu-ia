export type MarketQuote = { symbol: string; shortName?: string; price: number | null; changePercent: number | null; volume: number | null; history: Array<{ date: string; close: number }>; updatedAt: string };

async function fetchYahooQuote(ticker: string): Promise<MarketQuote> {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.SA?range=1mo&interval=1d`, { headers: { "User-Agent": "fundamentu-ia/0.1 (market data)" }, signal: AbortSignal.timeout(8000), next: { revalidate: 60 } });
  if (!response.ok) throw new Error(`Yahoo Finance respondeu com HTTP ${response.status}.`);
  const data = await response.json() as { chart?: { result?: Array<{ meta?: { symbol?: string; regularMarketPrice?: number; regularMarketChangePercent?: number }; timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null>; volume?: Array<number | null> }> } }> } };
  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  if (!result || !meta) throw new Error("Cotação não encontrada para este ticker.");
  const quote = result.indicators?.quote?.[0];
  const history = (result.timestamp ?? []).flatMap((timestamp, index) => typeof quote?.close?.[index] === "number" ? [{ date: new Date(timestamp * 1000).toISOString(), close: quote.close[index] as number }] : []).slice(-30);
  const latest = history.at(-1)?.close ?? null;
  const previous = history.at(-2)?.close ?? null;
  return { symbol: meta.symbol ?? `${ticker}.SA`, price: typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : latest, changePercent: typeof meta.regularMarketChangePercent === "number" ? meta.regularMarketChangePercent : latest !== null && previous ? ((latest / previous) - 1) * 100 : null, volume: typeof quote?.volume?.at(-1) === "number" ? quote.volume.at(-1) as number : null, history, updatedAt: new Date().toISOString() };
}

export async function fetchQuote(ticker: string): Promise<MarketQuote> {
  try {
    const response = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?range=1mo&interval=1d`, { headers: process.env.BRAPI_API_KEY ? { Authorization: `Bearer ${process.env.BRAPI_API_KEY}` } : {}, signal: AbortSignal.timeout(8000), next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`Mercado respondeu com HTTP ${response.status}.`);
    const data = await response.json() as { results?: Array<{ symbol?: string; shortName?: string; longName?: string; regularMarketPrice?: number; regularMarketChangePercent?: number; regularMarketVolume?: number; historicalDataPrice?: Array<{ date?: number; close?: number }> }> };
    const result = data.results?.[0];
    if (!result) throw new Error("Cotação não encontrada para este ticker.");
    const history = (result.historicalDataPrice ?? []).flatMap((item) => typeof item.date === "number" && typeof item.close === "number" ? [{ date: new Date(item.date * 1000).toISOString(), close: item.close }] : []).slice(-30);
    return { symbol: result.symbol ?? ticker, shortName: result.shortName ?? result.longName, price: typeof result.regularMarketPrice === "number" ? result.regularMarketPrice : null, changePercent: typeof result.regularMarketChangePercent === "number" ? result.regularMarketChangePercent : null, volume: typeof result.regularMarketVolume === "number" ? result.regularMarketVolume : null, history, updatedAt: new Date().toISOString() };
  } catch {
    return fetchYahooQuote(ticker);
  }
}
