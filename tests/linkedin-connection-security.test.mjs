import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { toSafeConnection, isConnectionOwnedBy } from "../src/lib/linkedin-connection-dto.ts";
import { createSessionId, hashSessionId } from "../src/lib/session-id.ts";
import { redactSensitive } from "../src/lib/log-redactor.ts";

const connectionRow = {
  id: "li_connection_1",
  userId: "user-b",
  encryptedCredentials: "encrypted-cookie-canary",
  accessToken: "access-token-canary",
  refreshToken: "refresh-token-canary",
  cookies: "li_at=session-cookie-canary",
  linkedinName: "Bilal Ahmad",
  linkedinAvatar: "https://example.test/avatar.png",
  status: "active",
  lastVerifiedAt: new Date("2026-10-14T00:00:00.000Z"),
  createdAt: new Date("2026-10-14T00:00:00.000Z"),
};

test("safe connection DTO excludes encrypted credentials and browser secrets", async () => {
  const dto = toSafeConnection(connectionRow);
  const jsonResponse = JSON.stringify({ success: true, accounts: [dto] });
  const html = `<main>${dto.linkedinName}</main><script id="__NEXT_DATA__">${JSON.stringify({ accounts: [dto] })}</script>`;

  assert.deepEqual(Object.keys(dto), ["id", "linkedinName", "linkedinAvatar", "status", "lastVerifiedAt"]);
  for (const output of [jsonResponse, html]) {
    assert.doesNotMatch(output, /encrypted-cookie-canary|access-token-canary|refresh-token-canary|session-cookie-canary|li_at/i);
  }

  const accountsRoute = await readFile(new URL("../src/app/api/linkedin/accounts/route.ts", import.meta.url), "utf8");
  const onboardingRoute = await readFile(new URL("../src/app/api/workspace/onboarding/route.ts", import.meta.url), "utf8");
  assert.match(accountsRoute, /connections\.map\(toSafeConnection\)/);
  assert.match(onboardingRoute, /connections\.map\(toSafeConnection\)/);
  assert.doesNotMatch(onboardingRoute, /return NextResponse\.json\(\{ success: true, workspace \}\)/);
});

test("a user cannot own another user's connection", () => {
  assert.equal(isConnectionOwnedBy(connectionRow, "user-a"), false);
  assert.equal(isConnectionOwnedBy(connectionRow, "user-b"), true);
});

test("app session cookie value is a random opaque identifier", () => {
  const sessionId = createSessionId();
  assert.match(sessionId, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(hashSessionId(sessionId), sessionId);
  assert.equal(hashSessionId(sessionId).length, 64);
});

test("log redactor masks secret-bearing keys and inline cookie/token values", () => {
  const redacted = redactSensitive({
    cookieHeader: "li_at=private-cookie",
    nested: { accessToken: "private-token", safe: "visible" },
    message: "request contained secret=private-secret",
  });
  const output = JSON.stringify(redacted);

  assert.doesNotMatch(output, /private-cookie|private-token|private-secret|li_at=/i);
  assert.match(output, /visible/);
});