import { createCipheriv } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiCredentials, aiProviderOrder } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

const providerIds = ["deepseek", "openai", "gemini", "claude"] as const;
type ProviderId = (typeof providerIds)[number];
const defaultOrder: ProviderId[] = [...providerIds];

function isProvider(value: unknown): value is ProviderId {
  return typeof value === "string" && providerIds.includes(value as ProviderId);
}

function encryptionKey(): Buffer {
  const raw = process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new Error("AI_CREDENTIALS_ENCRYPTION_KEY não configurada.");
  const key = Buffer.from(raw, "base64url");
  if (key.length !== 32) throw new Error("AI_CREDENTIALS_ENCRYPTION_KEY deve representar 32 bytes.");
  return key;
}

function encryptSecret(value: string): string {
  const iv = Buffer.from(cryptoRandomBytes(12));
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function cryptoRandomBytes(size: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(size));
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role !== "admin") return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  const [credentials, orderRows] = await Promise.all([
    db.select().from(aiCredentials),
    db.select().from(aiProviderOrder),
  ]);
  const byProvider = new Map(credentials.map((credential) => [credential.provider, credential]));
  const ordered = orderRows.length
    ? orderRows.sort((a, b) => a.position - b.position).map((row) => row.provider).filter(isProvider)
    : defaultOrder;
  const order = [...ordered, ...defaultOrder.filter((provider) => !ordered.includes(provider))];

  return Response.json({
    providers: order.map((provider) => {
      const credential = byProvider.get(provider);
      return { provider, connected: Boolean(credential?.apiKey), enabled: credential?.enabled ?? true, model: credential?.model ?? null, maskedKey: credential?.apiKey ? "••••••••" : null };
    }),
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Não autenticado." }, { status: 401 });
    if (session.user.role !== "admin") return Response.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    const body = await request.json() as { action?: string; provider?: string; apiKey?: string; model?: string | null; settings?: Array<{ provider: string; enabled: boolean; model: string }> };

    if (body.action === "saveCredential" && isProvider(body.provider) && body.apiKey?.trim()) {
      const existing = await db.select().from(aiCredentials).where(eq(aiCredentials.provider, body.provider));
      const now = new Date();
      if (existing[0]) {
        await db.update(aiCredentials).set({ apiKey: encryptSecret(body.apiKey.trim()), updatedAt: now }).where(eq(aiCredentials.provider, body.provider));
      } else {
        await db.insert(aiCredentials).values({ provider: body.provider, apiKey: encryptSecret(body.apiKey.trim()), model: body.model ?? null, enabled: true, createdAt: now, updatedAt: now });
      }
      return Response.json({ ok: true });
    }

    if (body.action === "removeCredential" && isProvider(body.provider)) {
      await db.delete(aiCredentials).where(eq(aiCredentials.provider, body.provider));
      return Response.json({ ok: true });
    }

    if (body.action === "saveSettings" && Array.isArray(body.settings)) {
      for (const [position, item] of body.settings.entries()) {
        if (!isProvider(item.provider)) continue;
        const existing = await db.select().from(aiProviderOrder).where(eq(aiProviderOrder.provider, item.provider));
        const now = new Date();
        if (existing[0]) await db.update(aiProviderOrder).set({ position, enabled: item.enabled, updatedAt: now }).where(eq(aiProviderOrder.provider, item.provider));
        else await db.insert(aiProviderOrder).values({ provider: item.provider, position, enabled: item.enabled, updatedAt: now });
        const credential = await db.select().from(aiCredentials).where(eq(aiCredentials.provider, item.provider));
        if (credential[0]) await db.update(aiCredentials).set({ model: item.model || null, enabled: item.enabled, updatedAt: now }).where(eq(aiCredentials.provider, item.provider));
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Operação ou provedor inválido." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar a configuração.";
    return Response.json({ error: message }, { status: 500 });
  }
}
