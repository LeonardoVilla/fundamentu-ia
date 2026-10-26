import { fetchQuote } from "@/lib/market/brapi";

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!ticker) return Response.json({ error: "Informe um ticker válido." }, { status: 400 });
  try { return Response.json({ quote: await fetchQuote(ticker) }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível consultar a cotação." }, { status: 502 }); }
}
