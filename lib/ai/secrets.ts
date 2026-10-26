import { createDecipheriv } from "node:crypto";

function encryptionKey(): Buffer {
  const raw = process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new Error("AI_CREDENTIALS_ENCRYPTION_KEY não configurada.");
  const key = Buffer.from(raw, "base64url");
  if (key.length !== 32) throw new Error("AI_CREDENTIALS_ENCRYPTION_KEY inválida.");
  return key;
}

export function decryptSecret(value: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Credencial criptografada inválida.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]).toString("utf8");
}
