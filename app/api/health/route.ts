import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function GET() {
  let database = "ok";
  try {
    await db.select({ id: users.id }).from(users).limit(1);
  } catch {
    database = "error";
  }

  const checks = {
    database,
    auth: Boolean(process.env.AUTH_SECRET && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    aiEncryption: Boolean(process.env.AI_CREDENTIALS_ENCRYPTION_KEY),
  };
  const healthy = checks.database === "ok" && checks.auth && checks.aiEncryption;
  return Response.json({ status: healthy ? "ok" : "degraded", checks, timestamp: new Date().toISOString() }, { status: healthy ? 200 : 503 });
}
