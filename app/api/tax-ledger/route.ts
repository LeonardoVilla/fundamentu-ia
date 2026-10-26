import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { taxIncome, taxTransactions } from "@/lib/db/schema";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const userId = Number(session.user.id);
  const year = Number(new URL(request.url).searchParams.get("year")) || new Date().getFullYear();
  const [transactions, income] = await Promise.all([
    db.select().from(taxTransactions).where(and(eq(taxTransactions.userId, userId), eq(taxTransactions.taxYear, year))).orderBy(desc(taxTransactions.tradeDate)),
    db.select().from(taxIncome).where(and(eq(taxIncome.userId, userId), eq(taxIncome.taxYear, year))).orderBy(desc(taxIncome.receivedDate)),
  ]);
  return Response.json({ transactions, income });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Faça login para registrar dados fiscais." }, { status: 401 });
  const body = await request.json() as Record<string, string | number | null>;
  const userId = Number(session.user.id);
  const taxYear = Number(body.taxYear) || new Date().getFullYear();
  try {
    if (body.kind === "income") {
      if (!body.incomeType || !body.receivedDate || !body.grossAmount) throw new Error("Informe o tipo, a data e o valor do rendimento.");
      const [item] = await db.insert(taxIncome).values({ userId, taxYear, ticker: body.ticker ? String(body.ticker).toUpperCase() : null, assetType: String(body.assetType || "Ação"), incomeType: String(body.incomeType), receivedDate: String(body.receivedDate), grossAmount: String(body.grossAmount), withholding: String(body.withholding || "0"), notes: body.notes ? String(body.notes) : null, createdAt: new Date() }).returning();
      return Response.json({ item }, { status: 201 });
    }
    if (!body.ticker || !body.operation || !body.tradeDate || !body.quantity || !body.unitPrice) throw new Error("Informe ticker, operação, data, quantidade e preço.");
    if (body.operation !== "compra" && body.operation !== "venda") throw new Error("Operação inválida.");
    const [item] = await db.insert(taxTransactions).values({ userId, taxYear, ticker: String(body.ticker).toUpperCase(), assetType: String(body.assetType || "Ação"), operation: body.operation, tradeDate: String(body.tradeDate), quantity: String(body.quantity), unitPrice: String(body.unitPrice), fees: String(body.fees || "0"), irrf: String(body.irrf || "0"), notes: body.notes ? String(body.notes) : null, createdAt: new Date() }).returning();
    return Response.json({ item }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível registrar o lançamento." }, { status: 400 }); }
}
