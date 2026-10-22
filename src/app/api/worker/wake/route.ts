/**
 * src/app/api/worker/wake/route.ts
 *
 * Fire-and-forget worker wake-up endpoint.
 *
 * Purpose (step 5 of the Render deployment plan):
 *  - Called by the Next.js app before enqueuing a job so the Render free-tier
 *    worker wakes from its 15-minute idle spin-down.
 *  - Render cold start takes ~30-60 s; this endpoint returns immediately
 *    (202 Accepted) after pinging /health so the user-facing request is not
 *    blocked waiting for Chromium to boot.
 *  - Also acts as the stuck-job requeue trigger: any CampaignLead stuck in
 *    "queued" state for > 5 minutes with a non-null lastError is re-queued
 *    (state reset to "queued", lastError cleared) and marked with a history
 *    event so a human can audit it. Leads are NEVER auto-resent — only reset
 *    to queued so the next scheduled run can decide whether to retry.
 *
 * Usage:
 *   POST /api/worker/wake          — fire-and-forget wake
 *   GET  /api/worker/wake          — returns current worker status
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CampaignLead from "@/models/CampaignLead";

const WORKER_URL = process.env.LINKEDIN_WORKER_URL?.trim().replace(/\/+$/, "");
const WORKER_SECRET = process.env.LINKEDIN_WORKER_SECRET?.trim() ?? "";

/** Pings the Render worker's /health route (non-blocking, best-effort). */
async function pingWorkerHealth(): Promise<{ ok: boolean; status?: number; latencyMs?: number }> {
  if (!WORKER_URL) return { ok: false };
  const start = Date.now();
  try {
    const res = await fetch(`${WORKER_URL}/health`, {
      method: "GET",
      headers: {
        "User-Agent": "SendPilot-WakeClient/1.0",
        "Bypass-Tunnel-Reminder": "true",
      },
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

/**
 * Requeues CampaignLeads that have been sitting in "queued" state for more
 * than STUCK_THRESHOLD_MS without moving forward, and whose lastError is set
 * (meaning a previous attempt failed mid-run, likely a worker restart).
 *
 * Safety rules (matches plan step 5):
 *  - NEVER auto-resend — only reset state so the scheduler can decide.
 *  - Marks the lead history with "requeued_after_worker_restart" so humans
 *    can audit whether the action may have already happened.
 *  - Does not touch leads in terminal states (failed, skipped, invited, etc.).
 */
async function requeueStuckLeads(): Promise<number> {
  const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  const stuckBefore = new Date(Date.now() - STUCK_THRESHOLD_MS);

  try {
    await connectDB();

    // Find leads that are still "queued" but have a lastError set and were
    // last touched > 5 minutes ago — sign of a mid-run worker crash.
    const stuck = await CampaignLead.find({
      state: "queued",
      lastError: { $ne: null, $exists: true },
      updatedAt: { $lt: stuckBefore },
    }).select("_id lastError");

    if (stuck.length === 0) return 0;

    const ids = stuck.map((l) => l._id);

    await CampaignLead.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          lastError: null,
          // Keep state as "queued" — do NOT advance or re-send
        },
        $push: {
          history: {
            event: "requeued_after_worker_restart",
            at: new Date(),
            note:
              "Job was stuck in queued state after a worker restart. " +
              "Reset to allow scheduler retry. " +
              "IMPORTANT: verify whether the action already executed before resending.",
          },
        },
      }
    );

    console.log(`[worker/wake] Requeued ${stuck.length} stuck CampaignLead(s) after worker restart.`);
    return stuck.length;
  } catch (err) {
    console.error("[worker/wake] Failed to requeue stuck leads:", err);
    return 0;
  }
}

/** POST — fire-and-forget wake call; responds immediately with 202. */
export async function POST() {
  // Kick off the health ping in the background; don't await it.
  const wakePromise = pingWorkerHealth().then((result) => {
    console.log(`[worker/wake] Health ping result:`, result);
  });

  // Also requeue any stuck jobs in the background.
  const requeuePromise = requeueStuckLeads();

  // Respond immediately so the caller isn't blocked on cold start.
  // The background tasks complete independently.
  void wakePromise;
  void requeuePromise;

  return NextResponse.json(
    {
      ok: true,
      message: "Worker wake initiated. Cold start may take 30–60 s.",
      workerUrl: WORKER_URL ?? null,
    },
    { status: 202 }
  );
}

/** GET — synchronous status check; waits for the health ping result. */
export async function GET() {
  if (!WORKER_URL) {
    return NextResponse.json(
      { ok: false, error: "LINKEDIN_WORKER_URL is not configured." },
      { status: 503 }
    );
  }

  const result = await pingWorkerHealth();
  const requeued = await requeueStuckLeads();

  return NextResponse.json({
    ok: result.ok,
    workerUrl: WORKER_URL,
    workerStatus: result.status,
    latencyMs: result.latencyMs,
    requeuedLeads: requeued,
  });
}
