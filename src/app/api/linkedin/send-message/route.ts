import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import connectDB from "@/lib/mongodb";
import LinkedInConnection from "@/models/LinkedInConnection";
import Lead from "@/models/Lead";
import CampaignLead from "@/models/CampaignLead";
import { decryptConnectionSecrets } from "@/lib/connection-crypto";
import { getWorkerHealth } from "@/lib/worker-contract";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const { profileUrl, message, leadId, campaignId } = body;

    if (!profileUrl || typeof profileUrl !== "string" || !profileUrl.trim()) {
      return NextResponse.json(
        { success: false, error: "Prospect LinkedIn profile URL is required." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Follow-up message text is required." },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Fetch user's active LinkedIn account
    let activeConn = await LinkedInConnection.findOne({
      userId: ctx.userId,
      status: "active",
    })
      .sort({ updatedAt: -1 })
      .select("+encryptedCredentials");

    if (!activeConn) {
      activeConn = await LinkedInConnection.findOne({
        userId: ctx.userId,
      })
        .sort({ updatedAt: -1 })
        .select("+encryptedCredentials");
    }

    if (!activeConn || !activeConn.encryptedCredentials) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No connected LinkedIn account found. Please connect your LinkedIn account first from Accounts.",
          requiresAccountConnection: true,
        },
        { status: 400 }
      );
    }

    // 2. Decrypt li_at and JSESSIONID
    const secrets = decryptConnectionSecrets<{
      accessToken?: string;
      liAt?: string;
      li_at?: string;
      jsessionId?: string;
      JSESSIONID?: string;
    }>(activeConn.encryptedCredentials);

    const liAt = (secrets.li_at || secrets.liAt || secrets.accessToken || "").trim();
    const jsessionId = (secrets.jsessionId || secrets.JSESSIONID || "").trim();

    if (!liAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your LinkedIn account authorization is missing or has expired. Please reconnect your account to continue.",
          requiresAccountConnection: true,
          requiresReconnect: true,
          redirectUrl: "/dashboard/accounts?reconnect=true",
        },
        { status: 400 }
      );
    }

    // Runner location and authentication are server-only configuration.
    const workerUrl = process.env.LINKEDIN_WORKER_URL?.trim().replace(/\/+$/, "");
    if (!workerUrl) {
      return NextResponse.json(
        { success: false, error: "LinkedIn worker is not configured.", retryable: true },
        { status: 503 }
      );
    }

    const health = await getWorkerHealth(workerUrl);
    if (!health.ok) {
      console.warn("[send-message] Worker offline or unreachable:", health.error);
      return NextResponse.json(
        { success: false, error: "LinkedIn worker is starting. Please retry shortly.", retryable: true },
        { status: 503 }
      );
    }
    if (health.outOfDate) {
      console.warn("[send-message] worker out of date");
      return NextResponse.json(
        {
          success: false,
          pending: true,
          queued: true,
          retryable: true,
          stage: "waiting_for_worker_update",
          message: "The LinkedIn worker is updating. Please retry shortly.",
        },
        { status: 202 }
      );
    }

    let result: {
      success: boolean;
      status: string;
      message: string;
      recipientName?: string;
      requiresReconnect?: boolean;
    };

    const workerSecret = process.env.LINKEDIN_WORKER_SECRET?.trim();
    if (!workerSecret) {
      console.error("[send-message] LINKEDIN_WORKER_SECRET is not configured.");
      return NextResponse.json(
        { success: false, error: "LinkedIn worker authentication is not configured." },
        { status: 503 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Bypass-Tunnel-Reminder": "true",
      "User-Agent": "SendPilot-Worker-Client/1.0",
      "x-worker-secret": workerSecret,
    };

    try {
      const workerRes = await fetch(`${workerUrl}/api/send-message`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            profileUrl: profileUrl.trim(),
            message: message.trim(),
            liAtCookie: liAt,
            jSessionId: jsessionId || undefined,
          }),
          signal: AbortSignal.timeout(45000),
      });

      const raw = await workerRes.json().catch(() => null);
      if (!raw) {
        throw new Error(`Worker returned HTTP ${workerRes.status}`);
      }
      result = raw;
    } catch (workerErr: unknown) {
      console.warn("[send-message] Worker request failed:", workerErr);
      return NextResponse.json(
        { success: false, error: "LinkedIn worker is unavailable. Please retry shortly.", retryable: true },
        { status: 503 }
      );
    }

    if (!result.success) {
      const isAuthError =
        result.requiresReconnect ||
        result.message.toLowerCase().includes("reconnect") ||
        result.message.toLowerCase().includes("re-authenticate") ||
        result.message.toLowerCase().includes("expired") ||
        result.message.toLowerCase().includes("authorization");

      return NextResponse.json(
        {
          success: false,
          error: result.message,
          status: result.status,
          requiresAccountConnection: isAuthError,
          requiresReconnect: isAuthError,
          redirectUrl: isAuthError ? "/dashboard/accounts?reconnect=true" : undefined,
        },
        { status: 422 }
      );
    }

    // 4. Update lead tracking in database if leadId provided
    if (leadId) {
      try {
        await Lead.updateOne(
          { _id: leadId, userId: ctx.userId },
          {
            $set: {
              status: "contacted",
              lastContactedAt: new Date(),
            },
          }
        );

        if (campaignId) {
          await CampaignLead.updateOne(
            { campaignId, leadId, userId: ctx.userId },
            {
              $set: { state: "invited" },
              $push: {
                history: {
                  event: "follow_up_message_sent",
                  at: new Date(),
                  note: message.slice(0, 100),
                },
              },
            }
          );
        }
      } catch (dbErr) {
        console.warn("[send-message] Failed to update lead history:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      status: "sent",
      recipientName: result.recipientName,
      message: result.message,
      sentAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return apiError(err, "send-linkedin-message");
  }
}
