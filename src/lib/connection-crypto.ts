import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type EncryptedBlob = {
  iv: string;
  authTag: string;
  ciphertext: string;
};

function getKey(): Buffer {
  let encodedKey = process.env.COOKIE_ENC_KEY || process.env.ENCRYPTION_KEY;
  if (!encodedKey && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(".env");
      encodedKey = process.env.COOKIE_ENC_KEY || process.env.ENCRYPTION_KEY;
    } catch {}
  }
  if (!encodedKey) {
    throw new Error("COOKIE_ENC_KEY or ENCRYPTION_KEY must be configured on the server");
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== encodedKey) {
    throw new Error("COOKIE_ENC_KEY or ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return key;
}

export function encryptConnectionSecrets(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);

  return JSON.stringify({
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  } satisfies EncryptedBlob);
}

export function decryptConnectionSecrets<T = Record<string, unknown>>(
  encrypted: string
): T {
  let blob: EncryptedBlob;
  try {
    blob = JSON.parse(encrypted) as EncryptedBlob;
  } catch {
    throw new Error("Encrypted connection data is invalid");
  }

  if (!blob.iv || !blob.authTag || !blob.ciphertext) {
    throw new Error("Encrypted connection data is invalid");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getKey(),
      Buffer.from(blob.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(blob.authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(blob.ciphertext, "base64")),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    throw new Error("Encrypted connection data failed authentication");
  }
}