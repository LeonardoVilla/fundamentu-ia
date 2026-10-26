import { and, desc, eq } from "drizzle-orm";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { riAgentRuns, riAnalyses, riDocuments, riSources } from "@/lib/db/schema";
import { synthesizeRi } from "@/lib/ai/riSynthesis";
import { methodLabel } from "@/lib/analysis/methods";
import { extractDcfInputs, extractMetrics, type ExtractedMetric } from "@/lib/analysis/metrics";
import { scoreMethod } from "@/lib/analysis/scoring";
import { fetchPublicFundamentals, mergeMetrics } from "@/lib/market/fundamentals";

const knownSources: Record<string, string> = {
  PETR4: "https://www.investidorpetrobras.com.br/",
  PETR3: "https://www.investidorpetrobras.com.br/",
  VALE3: "https://www.vale.com/pt/investors",
  ITUB4: "https://www.itau.com.br/relacoes-com-investidores/",
  ITUB3: "https://www.itau.com.br/relacoes-com-investidores/",
  BBAS3: "https://ri.bb.com.br/",
  KLBN3: "https://ri.klabin.com.br/",
  KLBN4: "https://ri.klabin.com.br/",
  KLBN11: "https://ri.klabin.com.br/",
};

function cleanHtml(html: string, sourceUrl: string): { title: string; excerpt: string; documents: Array<{ title: string; url: string; documentType: string }> } {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "Página de Relações com Investidores";
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
  const documents = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap((match) => {
    let parsedUrl: URL;
    try { parsedUrl = new URL(match[1], sourceUrl); } catch { return []; }
    if (parsedUrl.protocol !== "https:") return [];
    const url = parsedUrl.toString();
    const linkTitle = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const haystack = `${url} ${linkTitle}`.toLowerCase();
    const documentType = haystack.includes("itr") || haystack.includes("trimestr") ? "ITR" : haystack.includes("dfp") || haystack.includes("demonstra") ? "DFP" : haystack.includes("fato") ? "Fato relevante" : haystack.includes("apresent") ? "Apresentação" : "Documento RI";
    return url.match(/\.pdf(?:$|\?)/i) || /itr|dfp|demonstra|fato relevante|apresent/i.test(haystack) ? [{ title: linkTitle || documentType, url, documentType }] : [];
  }).filter((document, index, all) => all.findIndex((item) => item.url === document.url) === index).slice(0, 20);
  return { title, excerpt: text.slice(0, 4000), documents };
}

async function extractPdfText(url: string): Promise<string> {
  const runtime = globalThis as Record<string, unknown>;
  if (!runtime.DOMMatrix) runtime.DOMMatrix = class DOMMatrix { static fromMatrix() { return new (runtime.DOMMatrix as { new (): unknown })(); } };
  if (!runtime.ImageData) runtime.ImageData = class ImageData {};
  if (!runtime.Path2D) runtime.Path2D = class Path2D {};
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(pathToFileURL(join(process.cwd(), "public", "pdf.worker.mjs")).href);
  const response = await fetch(url, { headers: { "User-Agent": "fundamentu-ia/0.1 (RI research bot)" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`PDF HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  const parser = new PDFParse({ data });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      parser.getText(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Tempo limite ao ler o documento do RI.")), 12000); }),
    ]);
    return result.text.slice(0, 12000);
  } finally {
    if (timer) clearTimeout(timer);
    await parser.destroy();
  }
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": "fundamentu-ia/0.1 (RI research bot)" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Documento HTTP ${response.status}`);
  return response.text();
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Faça login para analisar um ativo." }, { status: 401 });
  const body = await request.json() as { ticker?: string; assetType?: string; method?: string; sourceUrl?: string };
  const ticker = body.ticker?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!ticker) return Response.json({ error: "Informe um ticker válido." }, { status: 400 });
  const typedSource = body.sourceUrl?.trim() ? (/^https?:\/\//i.test(body.sourceUrl.trim()) ? body.sourceUrl.trim() : `https://${body.sourceUrl.trim()}`) : null;
  const savedSource = typedSource ? null : (await db.select({ sourceUrl: riSources.sourceUrl }).from(riSources).where(eq(riSources.ticker, ticker)).limit(1))[0];
  const sourceUrl = typedSource || savedSource?.sourceUrl || knownSources[ticker];
  if (!sourceUrl) return Response.json({ error: "Ainda não encontramos automaticamente o RI deste ticker. Informe a URL oficial do RI." }, { status: 422 });
  try {
    const parsedSource = new URL(sourceUrl);
    if (parsedSource.protocol !== "https:" || parsedSource.hostname === "localhost" || parsedSource.hostname === "127.0.0.1" || parsedSource.hostname === "0.0.0.0" || parsedSource.hostname.endsWith(".local")) throw new Error("A fonte precisa ser uma URL HTTPS pública.");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "URL de RI inválida." }, { status: 400 });
  }

  // Deixa a associação persistida antes do crawler começar. Assim, tanto uma
  // URL do catálogo quanto uma URL informada pelo usuário não são perdidas
  // caso o site do RI esteja temporariamente indisponível.
  if (sourceUrl) {
    await db.insert(riSources).values({ ticker, assetType: body.assetType ?? "Ação", sourceUrl, sourceTitle: "Relações com Investidores", updatedAt: new Date() }).onConflictDoUpdate({ target: riSources.ticker, set: { assetType: body.assetType ?? "Ação", sourceUrl, updatedAt: new Date() } });
  }

  try {
    const response = await fetch(sourceUrl, { headers: { "User-Agent": "fundamentu-ia/0.1 (RI research bot)" }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`A fonte respondeu com HTTP ${response.status}.`);
    const { title, excerpt, documents: initialDocuments } = cleanHtml(await response.text(), sourceUrl);
    const discoveredDocuments = [...initialDocuments];
    const pageParts: string[] = [];
    for (const document of initialDocuments.filter((item) => !item.url.includes("/mzfilemanager/")).slice(0, 4)) {
      try {
        const linked = cleanHtml(await fetchHtml(document.url), document.url);
        pageParts.push(`\n\nPágina ${document.documentType} — ${document.title}:\n${linked.excerpt}`);
        discoveredDocuments.push(...linked.documents);
      } catch { /* página secundária pode bloquear automação */ }
    }
    const documents = discoveredDocuments.filter((document, index, all) => all.findIndex((item) => item.url === document.url) === index).slice(0, 30);
    await db.insert(riSources).values({ ticker, assetType: body.assetType ?? "Ação", sourceUrl, sourceTitle: title, updatedAt: new Date() }).onConflictDoUpdate({ target: riSources.ticker, set: { assetType: body.assetType ?? "Ação", sourceUrl, sourceTitle: title, updatedAt: new Date() } });
    const pdfParts: string[] = [];
    for (const document of documents.filter((item) => item.url.match(/\.pdf(?:$|\?)/i) || item.url.includes("/mzfilemanager/") || ["ITR", "DFP"].includes(item.documentType)).slice(0, 4)) {
      try { pdfParts.push(`\n\nDocumento ${document.documentType} — ${document.title}:\n${await extractPdfText(document.url)}`); } catch (error) { console.warn("RI PDF extraction failed", document.documentType, error instanceof Error ? error.message : "unknown error"); }
    }
    const riText = `${excerpt}${pageParts.join("")}${pdfParts.join("")}`.slice(0, 30000);
    const riMetrics = extractMetrics(riText).map((metric) => ({ ...metric, source: "ri" as const, sourceLabel: "RI" }));
    let publicMetrics: ExtractedMetric[] = [];
    try {
      publicMetrics = await fetchPublicFundamentals(ticker);
    } catch (error) {
      console.warn("Public fundamentals fallback failed", ticker, error instanceof Error ? error.message : "unknown error");
    }
    const metrics = mergeMetrics(riMetrics, publicMetrics);
    const publicBlock = publicMetrics.length > 0
      ? `\n\nDADOS PÚBLICOS COMPLEMENTARES (não provenientes do RI; usar somente quando o RI não informar o indicador):\n${publicMetrics.map((metric) => `- ${metric.name}: ${metric.value} — ${metric.sourceLabel}${metric.referenceDate ? `, referência ${metric.referenceDate}` : ""} — ${metric.sourceUrl}`).join("\n")}`
      : "";
    const sourceText = `${riText}${publicBlock}`.slice(0, 32000);
    const dcfInputs = extractDcfInputs(riText);
    const selectedMethod = body.method ?? "convergencia";
    const ruleEvaluation = scoreMethod(selectedMethod, metrics);
    const synthesis = await synthesizeRi({ ticker, assetType: body.assetType ?? "Ação", method: methodLabel(selectedMethod), sourceText });
    const [analysis] = await db.insert(riAnalyses).values({ userId: Number(session.user.id), ticker, assetType: body.assetType ?? "Ação", method: selectedMethod, sourceUrl, sourceTitle: title, excerpt: sourceText, metrics: JSON.stringify(metrics), ruleScore: ruleEvaluation.score, findings: JSON.stringify(ruleEvaluation.findings), status: synthesis ? "analyzed" : "collected", summary: synthesis?.summary, score: synthesis?.score, provider: synthesis?.provider, createdAt: new Date() }).returning({ id: riAnalyses.id, ticker: riAnalyses.ticker, assetType: riAnalyses.assetType, method: riAnalyses.method, sourceUrl: riAnalyses.sourceUrl, sourceTitle: riAnalyses.sourceTitle, excerpt: riAnalyses.excerpt, metrics: riAnalyses.metrics, ruleScore: riAnalyses.ruleScore, findings: riAnalyses.findings, summary: riAnalyses.summary, score: riAnalyses.score, provider: riAnalyses.provider, status: riAnalyses.status });
    if (synthesis) {
      await db.insert(riAgentRuns).values(synthesis.runs.map((run) => ({ analysisId: analysis.id, agentName: run.agentName, role: run.role, provider: synthesis.provider, output: run.output, status: run.status, createdAt: new Date() })));
    }
    if (documents.length) await db.insert(riDocuments).values(documents.map((document) => ({ analysisId: analysis.id, ...document, createdAt: new Date() })));
    return Response.json({ analysis: { ...analysis, metrics, findings: ruleEvaluation.findings, dcfInputs }, documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível consultar o RI.";
    await db.insert(riAnalyses).values({ userId: Number(session.user.id), ticker, assetType: body.assetType ?? "Ação", method: body.method ?? "convergencia", sourceUrl, status: "failed", error: message, createdAt: new Date() });
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const requestedId = Number(new URL(request.url).searchParams.get("id"));
  if (Number.isInteger(requestedId) && requestedId > 0) {
    const [analysis] = await db.select().from(riAnalyses).where(and(eq(riAnalyses.id, requestedId), eq(riAnalyses.userId, Number(session.user.id)))).limit(1);
    if (!analysis) return Response.json({ error: "Análise não encontrada." }, { status: 404 });
    const [runs, documents] = await Promise.all([
      db.select({ agentName: riAgentRuns.agentName, role: riAgentRuns.role, provider: riAgentRuns.provider, output: riAgentRuns.output, status: riAgentRuns.status, createdAt: riAgentRuns.createdAt }).from(riAgentRuns).where(eq(riAgentRuns.analysisId, requestedId)).orderBy(desc(riAgentRuns.createdAt)),
      db.select({ title: riDocuments.title, url: riDocuments.url, documentType: riDocuments.documentType }).from(riDocuments).where(eq(riDocuments.analysisId, requestedId)),
    ]);
    return Response.json({ analysis, runs, documents });
  }
  const rows = await db.select({ id: riAnalyses.id, ticker: riAnalyses.ticker, assetType: riAnalyses.assetType, method: riAnalyses.method, sourceUrl: riAnalyses.sourceUrl, sourceTitle: riAnalyses.sourceTitle, summary: riAnalyses.summary, score: riAnalyses.score, ruleScore: riAnalyses.ruleScore, findings: riAnalyses.findings, provider: riAnalyses.provider, status: riAnalyses.status, createdAt: riAnalyses.createdAt }).from(riAnalyses).where(eq(riAnalyses.userId, Number(session.user.id))).orderBy(desc(riAnalyses.createdAt));
  const analyses = rows.map((row) => {
    let findings: unknown[] = [];
    if (row.findings) {
      try { const parsed = JSON.parse(row.findings); findings = Array.isArray(parsed) ? parsed : []; } catch { findings = []; }
    }
    return { ...row, method: methodLabel(row.method), findings };
  });
  return Response.json({ analyses });
}
