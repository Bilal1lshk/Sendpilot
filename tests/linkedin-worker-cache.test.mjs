import assert from "node:assert/strict";
import test from "node:test";
import { shouldReuseCachedLinkedInSession } from "../src/lib/linkedin-worker-cache.ts";

test("reuses a recent cached result when no challenge continuation is submitted", () => {
  assert.equal(
    shouldReuseCachedLinkedInSession({ cachedAt: 1_000, now: 2_000 }),
    true
  );
});

test("does not reuse an app-approval challenge for a challenge-token continuation", () => {
  assert.equal(
    shouldReuseCachedLinkedInSession({
      cachedAt: 1_000,
      now: 2_000,
      pendingChallengeToken: "encrypted-challenge",
    }),
    false
  );
});

test("does not reuse a cached result after its TTL expires", () => {
  assert.equal(
    shouldReuseCachedLinkedInSession({ cachedAt: 1_000, now: 601_001 }),
    false
  );
});
