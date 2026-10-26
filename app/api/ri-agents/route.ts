import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { riAgents } from "@/lib/db/schema";

async function adminOnly() {
  const session = await auth();
  if (!session?.user) return { response: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  if (session.user.role !== "admin") return { response: Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const access = await adminOnly();
  if (access.response) return access.response;
  const agents = await db.select().from(riAgents);
  return Response.json({ agents });
}

export async function POST(request: Request) {
  const access = await adminOnly();
  if (access.response) return access.response;
  const body = await request.json() as { name?: string; role?: string; provider?: string; prompt?: string };
  if (!body.name?.trim() || !body.role?.trim() || !body.provider?.trim()) return Response.json({ error: "Nome, função e provedor são obrigatórios." }, { status: 400 });
  const now = new Date();
  const [agent] = await db.insert(riAgents).values({ name: body.name.trim(), role: body.role.trim(), provider: body.provider.trim(), prompt: body.prompt?.trim() ?? "", enabled: true, createdAt: now, updatedAt: now }).returning();
  return Response.json({ agent }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await adminOnly();
  if (access.response) return access.response;
  const body = await request.json() as { id?: number; name?: string; role?: string; provider?: string; prompt?: string; enabled?: boolean };
  if (!body.id) return Response.json({ error: "Agente inválido." }, { status: 400 });
  const [agent] = await db.update(riAgents).set({ name: body.name?.trim(), role: body.role?.trim(), provider: body.provider?.trim(), prompt: body.prompt?.trim(), enabled: body.enabled, updatedAt: new Date() }).where(eq(riAgents.id, body.id)).returning();
  return agent ? Response.json({ agent }) : Response.json({ error: "Agente não encontrado." }, { status: 404 });
}

export async function DELETE(request: Request) {
  const access = await adminOnly();
  if (access.response) return access.response;
  const body = await request.json() as { id?: number };
  if (!body.id) return Response.json({ error: "Agente inválido." }, { status: 400 });
  await db.delete(riAgents).where(eq(riAgents.id, body.id));
  return Response.json({ ok: true });
}
