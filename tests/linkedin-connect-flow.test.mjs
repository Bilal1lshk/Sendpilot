import assert from "node:assert/strict";
import { test, mock, before, after } from "node:test";
import { register } from "node:module";
import mongoose from "mongoose";

register("./loader.mjs", import.meta.url);
try { process.loadEnvFile(".env"); } catch {}

// Ensure test encryption key is configured
process.env.COOKIE_ENC_KEY = process.env.COOKIE_ENC_KEY || Buffer.alloc(32, 11).toString("base64");
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.LINKEDIN_CLIENT_ID = "test_client_id";
process.env.LINKEDIN_CLIENT_SECRET = "test_client_secret";
process.env.LINKEDIN_REDIRECT_URI = "http://localhost:3000/api/auth/linkedin/callback";

// Connect to MongoDB
before(async () => {
  const { default: connectDB } = await import("../src/lib/mongodb.ts");
  await connectDB();
});

after(async () => {
  const { default: LinkedInConnection } = await import("../src/models/LinkedInConnection.ts");
  const { default: Campaign } = await import("../src/models/Campaign.ts");
  const { default: CampaignLead } = await import("../src/models/CampaignLead.ts");
  await LinkedInConnection.deleteMany({ userId: { $regex: /^test_user_/ } });
  await Campaign.deleteMany({ userId: { $regex: /^test_user_/ } });
  await CampaignLead.deleteMany({ userId: { $regex: /^test_user_/ } });
  await mongoose.disconnect();
});

test("connectWithCredentials creates a verified connection for a new LinkedIn member", async () => {
  const { connectWithCredentials } = await import("../src/lib/linkedin-connections.ts");
  const { default: LinkedInConnection } = await import("../src/models/LinkedInConnection.ts");
  const { decryptConnectionSecrets } = await import("../src/lib/connection-crypto.ts");

  const testUserId = `test_user_${Date.now()}_1`;
  const mockSub = `sub_${Date.now()}_1`;

  // Mock fetch for LinkedIn userinfo
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("/v2/userinfo")) {
      return {
        ok: true,
        json: async () => ({
          sub: mockSub,
          name: "Test User 1",
          picture: "https://example.com/avatar1.jpg",
        }),
      };
    }
    return originalFetch(url, opts);
  };

  try {
    const result = await connectWithCredentials(testUserId, {
      accessToken: "mock_access_token_1",
      refreshToken: "mock_refresh_token_1",
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    assert.equal(result.verified, true);
    assert.equal(result.alreadyConnected, false);
    assert.equal(result.connection.linkedinName, "Test User 1");
    assert.equal(result.connection.linkedinAvatar, "https://example.com/avatar1.jpg");
    assert.equal(result.connection.status, "active");

    // Check DB record
    const dbRecord = await LinkedInConnection.findOne({ id: result.connection.id, userId: testUserId }).select("+encryptedCredentials");
    assert.ok(dbRecord);
    const decrypted = decryptConnectionSecrets(dbRecord.encryptedCredentials);
    assert.equal(decrypted.accessToken, "mock_access_token_1");
    assert.equal(decrypted.linkedinMemberId, mockSub);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("connectWithCredentials deduplicates and refreshes when the same LinkedIn member reconnects", async () => {
  const { connectWithCredentials } = await import("../src/lib/linkedin-connections.ts");
  const { default: LinkedInConnection } = await import("../src/models/LinkedInConnection.ts");
  const { decryptConnectionSecrets } = await import("../src/lib/connection-crypto.ts");

  const testUserId = `test_user_${Date.now()}_2`;
  const mockSub = `sub_${Date.now()}_2`;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("/v2/userinfo")) {
      return {
        ok: true,
        json: async () => ({
          sub: mockSub,
          name: "Test User 2",
          picture: "https://example.com/avatar2.jpg",
        }),
      };
    }
    return originalFetch(url, opts);
  };

  try {
    // First connection
    const res1 = await connectWithCredentials(testUserId, {
      accessToken: "token_v1",
      refreshToken: "refresh_v1",
    });
    assert.equal(res1.alreadyConnected, false);

    // Simulate that the user confirmed this connection
    await LinkedInConnection.updateOne({ id: res1.connection.id }, { $set: { confirmedAt: new Date() } });

    // Reconnecting the same member with new token
    const res2 = await connectWithCredentials(testUserId, {
      accessToken: "token_v2",
      refreshToken: "refresh_v2",
    });

    assert.equal(res2.verified, true);
    assert.equal(res2.alreadyConnected, true);
    assert.equal(res2.connection.id, res1.connection.id);

    // Verify there is only ONE connection in DB, not two
    const count = await LinkedInConnection.countDocuments({ userId: testUserId });
    assert.equal(count, 1);

    // Verify token was updated
    const updated = await LinkedInConnection.findOne({ id: res1.connection.id }).select("+encryptedCredentials");
    const creds = decryptConnectionSecrets(updated.encryptedCredentials);
    assert.equal(creds.accessToken, "token_v2");
    assert.equal(creds.refreshToken, "refresh_v2");
    assert.ok(updated.confirmedAt, "confirmedAt should be preserved on reconnect");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyConnection sets status to expired and stops campaign jobs on API failure", async () => {
  const { createConnection, verifyConnection } = await import("../src/lib/linkedin-connections.ts");
  const { default: LinkedInConnection } = await import("../src/models/LinkedInConnection.ts");
  const { default: Campaign } = await import("../src/models/Campaign.ts");
  const { default: CampaignLead } = await import("../src/models/CampaignLead.ts");

  const testUserId = `test_user_${Date.now()}_3`;

  // Create an active connection
  const conn = await createConnection(testUserId, {
    accessToken: "expired_token",
    linkedinMemberId: "sub_3",
  });
  conn.status = "active";
  conn.linkedinName = "Test User 3";
  await conn.save();

  // Create an active campaign and queued lead
  const campaign = await Campaign.create({
    userId: testUserId,
    name: "Active Test Campaign",
    senderAccountId: conn.id,
    senderName: conn.linkedinName,
    status: "active",
  });

  const lead = await CampaignLead.create({
    userId: testUserId,
    campaignId: campaign._id,
    leadId: new mongoose.Types.ObjectId(),
    state: "queued",
    currentStep: 0,
    nextActionAt: new Date(),
  });

  // Mock fetch to simulate 401 Unauthorized from LinkedIn
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("/v2/userinfo")) {
      return { ok: false, status: 401 };
    }
    return originalFetch(url, opts);
  };

  try {
    const res = await verifyConnection(conn.id, testUserId);
    assert.equal(res.verified, false);
    assert.equal(res.connection.status, "expired");

    // Check that campaign was paused
    const updatedCampaign = await Campaign.findById(campaign._id);
    assert.equal(updatedCampaign.status, "paused");

    // Check that lead was skipped
    const updatedLead = await CampaignLead.findById(lead._id);
    assert.equal(updatedLead.state, "skipped");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyConnection detects member ID mismatch and expires connection", async () => {
  const { createConnection, verifyConnection } = await import("../src/lib/linkedin-connections.ts");

  const testUserId = `test_user_${Date.now()}_4`;

  const conn = await createConnection(testUserId, {
    accessToken: "valid_token",
    linkedinMemberId: "expected_sub_original",
  });
  conn.status = "active";
  conn.linkedinName = "User Four";
  await conn.save();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("/v2/userinfo")) {
      return {
        ok: true,
        json: async () => ({
          sub: "DIFFERENT_SUB_ATTACKER",
          name: "User Four",
        }),
      };
    }
    return originalFetch(url, opts);
  };

  try {
    const res = await verifyConnection(conn.id, testUserId);
    assert.equal(res.verified, false);
    assert.equal(res.connection.status, "expired");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifyConnection detects name mismatch and expires connection", async () => {
  const { createConnection, verifyConnection } = await import("../src/lib/linkedin-connections.ts");

  const testUserId = `test_user_${Date.now()}_5`;

  const conn = await createConnection(testUserId, {
    accessToken: "valid_token",
    linkedinMemberId: "sub_5",
  });
  conn.status = "active";
  conn.linkedinName = "Alice Smith";
  await conn.save();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("/v2/userinfo")) {
      return {
        ok: true,
        json: async () => ({
          sub: "sub_5",
          name: "Bob Jones", // Different name
        }),
      };
    }
    return originalFetch(url, opts);
  };

  try {
    const res = await verifyConnection(conn.id, testUserId);
    assert.equal(res.verified, false);
    assert.equal(res.connection.status, "expired");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("migrateLegacyLinkedInConnections moves workspace accounts to LinkedInConnection collection", async () => {
  const { migrateLegacyLinkedInConnections } = await import("../src/lib/linkedin-connections.ts");
  const { default: Workspace } = await import("../src/models/Workspace.ts");
  const { default: LinkedInConnection } = await import("../src/models/LinkedInConnection.ts");
  const { decryptConnectionSecrets } = await import("../src/lib/connection-crypto.ts");

  const testUserId = `test_user_${Date.now()}_legacy`;

  // Create legacy workspace entry with step2 accounts
  await Workspace.create({
    userId: testUserId,
    name: "Legacy Test WS",
    step2: {
      status: "completed",
      data: {
        connectedAccounts: [
          {
            id: `legacy_${Date.now()}`,
            name: "Legacy User",
            photo: "https://example.com/legacy.jpg",
            accessToken: "legacy_token_123",
            linkedinMemberId: "legacy_sub_456",
          },
        ],
        invitedTeammates: [],
      },
    },
  });

  await migrateLegacyLinkedInConnections(testUserId);

  // Check that account was moved to LinkedInConnection
  const conn = await LinkedInConnection.findOne({ userId: testUserId }).select("+encryptedCredentials");
  assert.ok(conn);
  assert.equal(conn.linkedinName, "Legacy User");
  assert.equal(conn.status, "expired"); // legacy accounts start expired until re-verified
  const creds = decryptConnectionSecrets(conn.encryptedCredentials);
  assert.equal(creds.accessToken, "legacy_token_123");
  assert.equal(creds.linkedinMemberId, "legacy_sub_456");

  // Check that workspace step2 array was cleared
  const ws = await Workspace.findOne({ userId: testUserId });
  assert.deepEqual(ws.step2.data.connectedAccounts, []);

  await Workspace.deleteOne({ userId: testUserId });
  await LinkedInConnection.deleteOne({ userId: testUserId });
});

test("stopConnectionJobs safely pauses active campaigns and skips queued leads", async () => {
  const { stopConnectionJobs, createConnection } = await import("../src/lib/linkedin-connections.ts");
  const { default: Campaign } = await import("../src/models/Campaign.ts");
  const { default: CampaignLead } = await import("../src/models/CampaignLead.ts");
  const { default: LinkedInConnection } = await import("../src/models/LinkedInConnection.ts");

  const testUserId = `test_user_${Date.now()}_stop`;
  const conn = await createConnection(testUserId, { accessToken: "tok" });

  const camp = await Campaign.create({
    userId: testUserId,
    name: "Campaign to pause",
    senderAccountId: conn.id,
    status: "active",
  });

  const lead1 = await CampaignLead.create({
    userId: testUserId,
    campaignId: camp._id,
    leadId: new mongoose.Types.ObjectId(),
    state: "queued",
    nextActionAt: new Date(),
  });

  const lead2 = await CampaignLead.create({
    userId: testUserId,
    campaignId: camp._id,
    leadId: new mongoose.Types.ObjectId(),
    state: "accepted",
    nextActionAt: new Date(),
  });

  const lead3 = await CampaignLead.create({
    userId: testUserId,
    campaignId: camp._id,
    leadId: new mongoose.Types.ObjectId(),
    state: "replied", // terminal/finished state - should NOT be skipped
  });

  await stopConnectionJobs(conn.id, testUserId);

  const updatedCamp = await Campaign.findById(camp._id);
  assert.equal(updatedCamp.status, "paused");

  const l1 = await CampaignLead.findById(lead1._id);
  assert.equal(l1.state, "skipped");
  assert.equal(l1.nextActionAt, undefined);

  const l2 = await CampaignLead.findById(lead2._id);
  assert.equal(l2.state, "skipped");
  assert.equal(l2.nextActionAt, undefined);

  const l3 = await CampaignLead.findById(lead3._id);
  assert.equal(l3.state, "replied");

  await Campaign.deleteOne({ _id: camp._id });
  await CampaignLead.deleteMany({ campaignId: camp._id });
  await LinkedInConnection.deleteOne({ id: conn.id });
});

test("connectWithCredentials supports connecting multiple different LinkedIn accounts to one workspace", async () => {
  const { connectWithCredentials } = await import("../src/lib/linkedin-connections.ts");
  const { default: LinkedInConnection } = await import("../src/models/LinkedInConnection.ts");

  const testUserId = `test_user_${Date.now()}_multi`;
  const sub1 = `sub_multi_1_${Date.now()}`;
  const sub2 = `sub_multi_2_${Date.now()}`;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("/v2/userinfo")) {
      const authHeader = opts?.headers?.Authorization || "";
      if (authHeader.includes("token_account_1")) {
        return {
          ok: true,
          json: async () => ({
            sub: sub1,
            name: "First Account",
            picture: "https://example.com/avatar1.jpg",
          }),
        };
      }
      if (authHeader.includes("token_account_2")) {
        return {
          ok: true,
          json: async () => ({
            sub: sub2,
            name: "Second Account",
            picture: "https://example.com/avatar2.jpg",
          }),
        };
      }
    }
    return originalFetch(url, opts);
  };

  try {
    // 1. Connect Account #1
    const res1 = await connectWithCredentials(testUserId, {
      accessToken: "token_account_1",
      refreshToken: "refresh_1",
    });
    assert.equal(res1.verified, true);
    assert.equal(res1.alreadyConnected, false);
    assert.equal(res1.connection.linkedinName, "First Account");

    // 2. Connect Account #2 (secondary account to same workspace)
    const res2 = await connectWithCredentials(testUserId, {
      accessToken: "token_account_2",
      refreshToken: "refresh_2",
    });
    assert.equal(res2.verified, true);
    assert.equal(res2.alreadyConnected, false);
    assert.equal(res2.connection.linkedinName, "Second Account");

    // 3. Verify BOTH distinct accounts exist simultaneously in the workspace
    const allAccounts = await LinkedInConnection.find({ userId: testUserId });
    assert.equal(allAccounts.length, 2);

    const ids = allAccounts.map((a) => a.id);
    assert.ok(ids.includes(res1.connection.id));
    assert.ok(ids.includes(res2.connection.id));
    assert.notEqual(res1.connection.id, res2.connection.id);

    // 4. Verify Account #1 is automatically disconnected when Account #2 connects
    const acc1After = await LinkedInConnection.findOne({ id: res1.connection.id });
    const acc2After = await LinkedInConnection.findOne({ id: res2.connection.id });
    assert.equal(acc1After.status, "disconnected", "First account should be automatically disconnected");
    assert.equal(acc2After.status, "active", "Second account should be active");
  } finally {
    globalThis.fetch = originalFetch;
    await LinkedInConnection.deleteMany({ userId: testUserId });
  }
});

test("disconnectConnection marks active account as disconnected without deleting it", async () => {
  const { createConnection, disconnectConnection } = await import("../src/lib/linkedin-connections.ts");
  const { default: LinkedInConnection } = await import("../src/models/LinkedInConnection.ts");

  const testUserId = `test_user_${Date.now()}_disconnect`;
  const conn = await createConnection(testUserId, { accessToken: "tok_disc" });
  conn.status = "active";
  conn.linkedinName = "Active Disconnect User";
  await conn.save();

  const discResult = await disconnectConnection(conn.id, testUserId);
  assert.ok(discResult);
  assert.equal(discResult.status, "disconnected");

  // Verify DB record still exists and status is disconnected
  const inDb = await LinkedInConnection.findOne({ id: conn.id, userId: testUserId });
  assert.ok(inDb);
  assert.equal(inDb.status, "disconnected");

  await LinkedInConnection.deleteOne({ id: conn.id });
});

test("connectAccount activates a disconnected account and automatically disconnects any active account", async () => {
  const { createConnection, connectAccount } = await import("../src/lib/linkedin-connections.ts");
  const { default: LinkedInConnection } = await import("../src/models/LinkedInConnection.ts");

  const testUserId = `test_user_${Date.now()}_switch`;
  const subA = `sub_switch_a_${Date.now()}`;
  const subB = `sub_switch_b_${Date.now()}`;

  // Account A is active
  const connA = await createConnection(testUserId, { accessToken: "token_a", linkedinMemberId: subA });
  connA.status = "active";
  connA.linkedinName = "Account A";
  await connA.save();

  // Account B is disconnected
  const connB = await createConnection(testUserId, { accessToken: "token_b", linkedinMemberId: subB });
  connB.status = "disconnected";
  connB.linkedinName = "Account B";
  await connB.save();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("/v2/userinfo")) {
      const authHeader = opts?.headers?.Authorization || "";
      if (authHeader.includes("token_b")) {
        return {
          ok: true,
          json: async () => ({
            sub: subB,
            name: "Account B",
            picture: "https://example.com/avatarB.jpg",
          }),
        };
      }
    }
    return originalFetch(url, opts);
  };

  try {
    // Connect Account B
    const result = await connectAccount(connB.id, testUserId);
    assert.equal(result.success, true);
    assert.equal(result.verified, true);
    assert.equal(result.connection.status, "active");

    // Verify Account A was automatically disconnected
    const updatedA = await LinkedInConnection.findOne({ id: connA.id });
    assert.equal(updatedA.status, "disconnected", "Account A should have been automatically disconnected");

    // Verify Account B is active
    const updatedB = await LinkedInConnection.findOne({ id: connB.id });
    assert.equal(updatedB.status, "active", "Account B should be active");
  } finally {
    globalThis.fetch = originalFetch;
    await LinkedInConnection.deleteMany({ userId: testUserId });
  }
});

