import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptConnectionSecrets, encryptConnectionSecrets } from "../src/lib/connection-crypto.ts";

process.env.COOKIE_ENC_KEY = Buffer.alloc(32, 7).toString("base64");

test("connection secrets round-trip through AES-256-GCM", () => {
  const secret = { accessToken: "access-secret", refreshToken: "refresh-secret" };
  const encrypted = encryptConnectionSecrets(secret);
  const secondEncryption = encryptConnectionSecrets(secret);

  assert.deepEqual(decryptConnectionSecrets(encrypted), secret);
  assert.notEqual(JSON.parse(encrypted).iv, JSON.parse(secondEncryption).iv);
  assert.equal(encrypted.includes(secret.accessToken), false);
  assert.equal(encrypted.includes(secret.refreshToken), false);
  assert.equal(Buffer.from(JSON.parse(encrypted).iv, "base64").length, 12);
  assert.equal(Buffer.from(JSON.parse(encrypted).authTag, "base64").length, 16);
});

test("tampered ciphertext fails authentication", () => {
  const encrypted = JSON.parse(encryptConnectionSecrets({ accessToken: "secret" }));
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
  ciphertext[0] ^= 1;
  encrypted.ciphertext = ciphertext.toString("base64");

  assert.throws(
    () => decryptConnectionSecrets(JSON.stringify(encrypted)),
    /failed authentication/
  );
});