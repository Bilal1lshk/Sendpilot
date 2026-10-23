import assert from "node:assert/strict";
import { test } from "node:test";
import { register } from "node:module";

register("./loader.mjs", import.meta.url);

const { getWorkerHealth, WORKER_CONTRACT_VERSION } = await import(
  "../src/lib/worker-contract.ts"
);

async function checkHealthResponse(t, payload) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  return getWorkerHealth("https://worker.example");
}

test("accepts a healthy worker with the matching contract version", async (t) => {
  const health = await checkHealthResponse(t, {
    status: "ok",
    contractVersion: WORKER_CONTRACT_VERSION,
  });

  assert.equal(health.ok, true);
  assert.equal(health.outOfDate, false);
});

test("marks workers without a contract version as out of date", async (t) => {
  const health = await checkHealthResponse(t, { status: "healthy" });

  assert.equal(health.ok, true);
  assert.equal(health.outOfDate, true);
});

test("marks workers with a different contract version as out of date", async (t) => {
  const health = await checkHealthResponse(t, {
    status: "ok",
    contractVersion: WORKER_CONTRACT_VERSION + 1,
  });

  assert.equal(health.ok, true);
  assert.equal(health.outOfDate, true);
});
