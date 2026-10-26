import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { watchlist } from "@/lib/db/schema";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase();
  const items = await db.select().from(watchlist).where(ticker ? and(eq(watchlist.userId, Number(session.user.id)), eq(watchlist.ticker, ticker)) : eq(watchlist.userId, Number(session.user.id))).orderBy(desc(watchlist.createdAt));
  return Response.json({ items });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Faça login para monitorar ativos." }, { status: 401 });
  const body = await request.json() as { ticker?: string; assetType?: string };
  const ticker = body.ticker?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!ticker) return Response.json({ error: "Ticker inválido." }, { status: 400 });
  const [item] = await db.insert(watchlist).values({ userId: Number(session.user.id), ticker, assetType: body.assetType ?? "Ação" }).onConflictDoUpdate({ target: [watchlist.userId, watchlist.ticker], set: { assetType: body.assetType ?? "Ação" } }).returning();
  return Response.json({ item });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase();
  if (!ticker) return Response.json({ error: "Ticker inválido." }, { status: 400 });
  await db.delete(watchlist).where(and(eq(watchlist.userId, Number(session.user.id)), eq(watchlist.ticker, ticker)));
  return Response.json({ ok: true });
}
