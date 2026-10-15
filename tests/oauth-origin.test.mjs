import assert from "node:assert/strict";
import { test } from "node:test";
import { register } from "node:module";

register("./loader.mjs", import.meta.url);

test("resolveAppOrigin extracts origin from x-forwarded-host and x-forwarded-proto", async () => {
  const { resolveAppOrigin } = await import("../src/lib/oauth-origin.ts");

  const req = new Request("http://internal-cluster:3000/api/auth/linkedin/authorize", {
    headers: {
      "x-forwarded-host": "sendpilot-gamma.vercel.app",
      "x-forwarded-proto": "https",
    },
  });

  const origin = resolveAppOrigin(req);
  assert.equal(origin, "https://sendpilot-gamma.vercel.app");
});

test("resolveLinkedInRedirectUri ignores localhost LINKEDIN_REDIRECT_URI when origin is production", async () => {
  const { resolveLinkedInRedirectUri } = await import("../src/lib/oauth-origin.ts");

  const oldEnv = process.env.LINKEDIN_REDIRECT_URI;
  try {
    process.env.LINKEDIN_REDIRECT_URI = "http://localhost:3000/api/auth/linkedin/callback";

    const req = new Request("https://sendpilot-gamma.vercel.app/api/auth/linkedin/authorize", {
      headers: {
        "x-forwarded-host": "sendpilot-gamma.vercel.app",
        "x-forwarded-proto": "https",
      },
    });

    const uri = resolveLinkedInRedirectUri(req);
    // Must NOT be localhost!
    assert.equal(uri, "https://sendpilot-gamma.vercel.app/api/auth/linkedin/callback");
  } finally {
    process.env.LINKEDIN_REDIRECT_URI = oldEnv;
  }
});

test("resolveLinkedInRedirectUri respects localhost in local development environment", async () => {
  const { resolveLinkedInRedirectUri } = await import("../src/lib/oauth-origin.ts");

  const oldEnv = process.env.LINKEDIN_REDIRECT_URI;
  const oldVercel = process.env.VERCEL;
  const oldNodeEnv = process.env.NODE_ENV;
  try {
    delete process.env.VERCEL;
    process.env.NODE_ENV = "development";
    process.env.LINKEDIN_REDIRECT_URI = "http://localhost:3000/api/auth/linkedin/callback";

    const req = new Request("http://localhost:3000/api/auth/linkedin/authorize");

    const uri = resolveLinkedInRedirectUri(req);
    assert.equal(uri, "http://localhost:3000/api/auth/linkedin/callback");
  } finally {
    process.env.LINKEDIN_REDIRECT_URI = oldEnv;
    if (oldVercel) process.env.VERCEL = oldVercel;
    process.env.NODE_ENV = oldNodeEnv;
  }
});

test("getLinkedInRedirectUriCandidates returns unique candidates", async () => {
  const { getLinkedInRedirectUriCandidates } = await import("../src/lib/oauth-origin.ts");

  const candidates = getLinkedInRedirectUriCandidates(
    "https://sendpilot-gamma.vercel.app/api/auth/linkedin/callback",
    "https://sendpilot-gamma.vercel.app"
  );

  assert.ok(Array.isArray(candidates));
  assert.ok(candidates.includes("https://sendpilot-gamma.vercel.app/api/auth/linkedin/callback"));
  // Ensure no duplicates
  const set = new Set(candidates);
  assert.equal(set.size, candidates.length);
});
