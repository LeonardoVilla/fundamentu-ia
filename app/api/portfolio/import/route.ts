import * as XLSX from "xlsx";
import { and, desc, eq, inArray } from "drizzle-orm";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { portfolioAssets, portfolioImports } from "@/lib/db/schema";

function normalize(value: unknown): string { return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function numberValue(value: unknown): string | null { if (value === null || value === undefined || value === "") return null; if (typeof value === "number") return String(value); const text = String(value).trim(); const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text; const number = Number(normalized); return Number.isFinite(number) ? String(number) : null; }
function find(row: Record<string, unknown>, names: string[]): unknown {
  for (const name of names) {
    const key = Object.keys(row).find(candidate => normalize(candidate) === name);
    if (key) return row[key];
  }
  return undefined;
}
function findNumeric(row: Record<string, unknown>, names: string[]): string | null {
  for (const name of names) {
    const value = numberValue(find(row, [name]));
    if (value !== null) return value;
  }
  return null;
}
function sheetAssetType(sheetName: string, ticker: string, row: Record<string, unknown>): string {
  const sheet = normalize(sheetName);
  if (sheet === "acoes") return "Ação";
  if (sheet === "bdr") return "BDR";
  if (sheet === "etf") return "ETF";
  if (sheet === "fundodeinvestimento") return ticker.endsWith("11") ? "FII" : "Fundo";
  if (sheet === "rendafixa") return "Renda Fixa";
  if (sheet === "tesourodireto") return "Tesouro Direto";
  return String(find(row, ["tipodeativo", "classe", "natureza"]) || "Ação").trim();
}

function parseMoney(value: string): number { return Number(value.replace(/\./g, "").replace(",", ".")); }

async function parseFixedIncomePdf(file: File) {
  const runtime = globalThis as Record<string, unknown>;
  if (!runtime.DOMMatrix) runtime.DOMMatrix = class DOMMatrix { static fromMatrix() { return new (runtime.DOMMatrix as { new (): unknown })(); } };
  if (!runtime.ImageData) runtime.ImageData = class ImageData {};
  if (!runtime.Path2D) runtime.Path2D = class Path2D {};
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(pathToFileURL(join(process.cwd(), "public", "pdf.worker.mjs")).href);
  const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
  try {
    const result = await parser.getText();
    const institution = result.text.match(/www\.([\w-]+)\.com/i)?.[1] ?? "Não informado";
    const previdenciaBalance = result.text.match(/Saldo bruto final[\s\S]{0,120}?R\$\s*([\d.]+,\d{2})/i);
    if (previdenciaBalance && /previd[eê]ncia privada/i.test(result.text)) {
      const currentValue = String(parseMoney(previdenciaBalance[1]));
      return [{ ticker: "PREVIDENCIA", assetType: "Previdência Privada", quantity: "1", averagePrice: currentValue, acquisitionDate: null, maturityDate: null, acquisitionValue: null, currentValue, institution: institution.charAt(0).toUpperCase() + institution.slice(1) }];
    }
    return result.text.split("\n").map(line => line.replace(/\s+/g, " ").trim()).flatMap(line => {
      const match = line.match(/(?:R\$\s*[\d.]+,\d{2}\s+)?(\d{5,})\s+(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+/);
      if (!match) return [];
      const type = line.match(/\b(CDB|CRI|LCD|LCI|LIG|LC)\b/i)?.[1]?.toUpperCase() ?? "Renda Fixa";
      const moneyValues = [...line.matchAll(/R\$\s*([\d.]+,\d{2})/g)].map(item => parseMoney(item[1]));
      const updatedValue = Math.max(...moneyValues.slice(3).filter(value => value > 0));
      if (!Number.isFinite(updatedValue) || updatedValue <= 0) return [];
      return [{ ticker: `${type}${match[1]}`, assetType: type, quantity: "1", averagePrice: String(updatedValue), acquisitionDate: match[2], maturityDate: match[3], acquisitionValue: String(moneyValues[1] ?? 0), currentValue: String(updatedValue), institution: institution.charAt(0).toUpperCase() + institution.slice(1) }];
    });
  } finally { await parser.destroy(); }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Faça login para importar sua carteira." }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Selecione um arquivo PDF, XLSX, XLS ou CSV." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: "O arquivo deve ter no máximo 5 MB." }, { status: 413 });
  try {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const assets = extension === "pdf" ? await parseFixedIncomePdf(file) : await (async () => {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      return workbook.SheetNames.flatMap(sheetName => {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
      return rows.map(row => {
        const ticker = String(find(row, ["ticker", "ativo", "codigo", "papel", "codigodenegociacao", "codigonegociacao", "codigoisin", "codigoisindistribuicao", "produto"]) ?? "").split(" - ")[0].trim().toUpperCase();
        return {
          ticker,
          assetType: sheetAssetType(sheetName, ticker, row),
          quantity: numberValue(find(row, ["quantidade", "qtd", "saldo", "quantidadedisponivel", "quantidadetotal"])),
          averagePrice: (() => {
            const directPrice = findNumeric(row, ["precomedio", "precounitario", "valorcompra", "precodeaquisicao", "precodefechamento", "precoatualizadomtm", "precoatualizadocurva", "precoatualizadofechamento"]);
            if (directPrice !== null) return directPrice;
            const quantity = numberValue(find(row, ["quantidade", "qtd", "saldo", "quantidadedisponivel", "quantidadetotal"]));
            const updatedValue = findNumeric(row, ["valoratualizadomtm", "valoratualizadocurva", "valoratualizado", "valorbruto", "valorliquido"]);
            if (quantity !== null && updatedValue !== null && Number(quantity) > 0) return String(Number(updatedValue) / Number(quantity));
            return "";
          })(),
          institution: String(find(row, ["corretora", "instituicao", "custodiante", "agente"]) ?? "").trim(),
        };
      });
      }).filter(asset => /^[A-Z0-9]{4,30}$/.test(asset.ticker));
    })();
    if (!assets.length) return Response.json({ error: "Nenhum ativo reconhecido. Verifique se a planilha possui uma coluna Ticker, Ativo ou Código." }, { status: 422 });
    const userId = Number(session.user.id); const now = new Date();
    const filename = file.name;
    const previousImports = await db.select({ id: portfolioImports.id }).from(portfolioImports).where(and(eq(portfolioImports.userId, userId), eq(portfolioImports.filename, filename)));
    if (previousImports.length) await db.delete(portfolioAssets).where(and(eq(portfolioAssets.userId, userId), inArray(portfolioAssets.importId, previousImports.map(item => item.id))));
    const [imported] = await db.insert(portfolioImports).values({ userId, filename, format: filename.split(".").pop()?.toLowerCase() ?? "desconhecido", rowCount: assets.length, createdAt: now }).returning({ id: portfolioImports.id });
    await db.insert(portfolioAssets).values(assets.map(asset => ({ ...asset, userId, importId: imported.id, createdAt: now })));
    return Response.json({ importId: imported.id, assets }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível ler a planilha." }, { status: 422 }); }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const assets = await db.select().from(portfolioAssets).where(eq(portfolioAssets.userId, Number(session.user.id))).orderBy(desc(portfolioAssets.createdAt));
  return Response.json({ assets });
}
