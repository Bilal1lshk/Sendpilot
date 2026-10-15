import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { register } from "node:module";
import mongoose from "mongoose";

register("./loader.mjs", import.meta.url);
try { process.loadEnvFile(".env"); } catch {}

before(async () => {
  const { default: connectDB } = await import("../src/lib/mongodb.ts");
  await connectDB();
});

after(async () => {
  const { default: Workspace } = await import("../src/models/Workspace.ts");
  await Workspace.deleteMany({ userId: { $regex: /^test_ob_user_/ } });
  await mongoose.disconnect();
});

test("Workspace model initializes with onboardingCompleted false", async () => {
  const { default: Workspace } = await import("../src/models/Workspace.ts");
  const testUserId = `test_ob_user_${Date.now()}`;

  const ws = await Workspace.create({
    userId: testUserId,
    name: "Default Workspace",
  });

  assert.equal(ws.onboardingCompleted, false);
  assert.equal(ws.name, "Default Workspace");

  // Simulating completing workspace setup
  ws.name = "Acme Outbound HQ";
  ws.onboardingCompleted = true;
  await ws.save();

  const reloaded = await Workspace.findOne({ userId: testUserId });
  assert.equal(reloaded?.name, "Acme Outbound HQ");
  assert.equal(reloaded?.onboardingCompleted, true);
});
