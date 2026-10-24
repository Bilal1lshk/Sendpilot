import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const vercelConfig = JSON.parse(
  await readFile(new URL("../vercel.json", import.meta.url), "utf8")
);

test("Vercel ignoreCommand stays within the 256-character schema limit", () => {
  assert.equal(typeof vercelConfig.ignoreCommand, "string");
  assert.ok(vercelConfig.ignoreCommand.length <= 256);
  assert.equal(vercelConfig.ignoreCommand, "node scripts/vercel-ignore-build.mjs");
});
