import * as XLSX from "xlsx";
import { eq, desc } from "drizzle-orm";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { taxDocuments } from "@/lib/db/schema";

async function extractText(file: File): Promise<string> {
  const data = Buffer.from(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".pdf")) {
    const runtime = globalThis as Record<string, unknown>;
    if (!runtime.DOMMatrix) runtime.DOMMatrix = class DOMMatrix { static fromMatrix() { return new (runtime.DOMMatrix as { new (): unknown })(); } };
    if (!runtime.ImageData) runtime.ImageData = class ImageData {};
    if (!runtime.Path2D) runtime.Path2D = class Path2D {};
    const { PDFParse } = await import("pdf-parse");
    PDFParse.setWorker(pathToFileURL(join(process.cwd(), "public", "pdf.worker.mjs")).href);
    const parser = new PDFParse({ data });
    try { const result = await parser.getText(); return result.text.slice(0, 50000); } finally { await parser.destroy(); }
  }
  const workbook = XLSX.read(data, { type: "array" });
  return workbook.SheetNames.map(name => `## ${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`).join("\n\n").slice(0, 50000);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const documents = await db.select({ id: taxDocuments.id, taxYear: taxDocuments.taxYear, documentType: taxDocuments.documentType, filename: taxDocuments.filename, format: taxDocuments.format, size: taxDocuments.size, extractionStatus: taxDocuments.extractionStatus, createdAt: taxDocuments.createdAt }).from(taxDocuments).where(eq(taxDocuments.userId, Number(session.user.id))).orderBy(desc(taxDocuments.createdAt));
  return Response.json({ documents });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Faça login para enviar documentos." }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Selecione um PDF, XLSX, XLS ou CSV." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "O documento deve ter no máximo 10 MB." }, { status: 413 });
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "xlsx", "xls", "csv"].includes(extension)) return Response.json({ error: "Formato não suportado." }, { status: 400 });
  const taxYear = Number(formData.get("taxYear")) || new Date().getFullYear();
  const documentType = String(formData.get("documentType") || "Outro");
  try {
    const text = await extractText(file);
    const [document] = await db.insert(taxDocuments).values({ userId: Number(session.user.id), taxYear, documentType, filename: file.name, format: extension, size: file.size, extractionStatus: "extracted", extractedText: text, createdAt: new Date() }).returning({ id: taxDocuments.id, filename: taxDocuments.filename, extractionStatus: taxDocuments.extractionStatus });
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível extrair o documento.";
    const [document] = await db.insert(taxDocuments).values({ userId: Number(session.user.id), taxYear, documentType, filename: file.name, format: extension, size: file.size, extractionStatus: "failed", extractedText: message, createdAt: new Date() }).returning({ id: taxDocuments.id, filename: taxDocuments.filename, extractionStatus: taxDocuments.extractionStatus });
    return Response.json({ document, error: "O arquivo foi recebido, mas não foi possível extrair o conteúdo automaticamente." }, { status: 422 });
  }
}
