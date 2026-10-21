import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import connectDB from "@/lib/mongodb";
import LinkedInConnection from "@/models/LinkedInConnection";
import Workspace from "@/models/Workspace";
import Lead from "@/models/Lead";
import CampaignLead from "@/models/CampaignLead";
import { decryptConnectionSecrets } from "@/lib/connection-crypto";
import { sendLinkedInConnectionWithPlaywright } from "@/lib/playwright-linkedin-connect";
import { DEFAULT_LINKEDIN_WORKER_URL } from "@/lib/linkedin-worker-config";
import { invalidateDbCache } from "@/lib/db-cache";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const { profileUrl, note, leadId, enrollmentId, campaignId } = body;

    if (!profileUrl || typeof profileUrl !== "string" || !profileUrl.trim()) {
      return NextResponse.json(
        { success: false, error: "Profile URL is required." },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Fetch user's active LinkedIn account credentials
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
            "No connected LinkedIn account found. Please connect your LinkedIn account first from Accounts or Settings.",
          requiresAccountConnection: true,
          requiresReconnect: true,
          redirectUrl: "/dashboard/accounts?reconnect=true",
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

    // 3. Check for dedicated residential worker runner offload
    let workerUrl: string | undefined = (
      process.env.LINKEDIN_WORKER_URL?.trim() || DEFAULT_LINKEDIN_WORKER_URL
    ).replace(/\/+$/, "");

    // Fast pre-flight health check on worker URL to prevent 502 Bad Gateway and latency hangs
    if (workerUrl) {
      try {
        const healthRes = await fetch(`${workerUrl}/health`, {
          method: "GET",
          headers: { "Bypass-Tunnel-Reminder": "true" },
          signal: AbortSignal.timeout(2500),
        });
        if (!healthRes.ok) {
          throw new Error(`Worker health check failed: HTTP ${healthRes.status}`);
        }
      } catch (healthErr) {
        console.warn("[send-connection] Worker offline / unreachable, falling back to local runner:", healthErr);
        workerUrl = undefined;
      }
    }

    let result: {
      success: boolean;
      status: string;
      message: string;
      recipientName?: string;
      requiresReconnect?: boolean;
    };

    if (workerUrl) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "true",
        "User-Agent": "SendPilot-Worker-Client/1.0",
      };
      const workerSecret = process.env.LINKEDIN_WORKER_SECRET?.trim();
      if (workerSecret) headers["x-worker-secret"] = workerSecret;

      try {
        const workerRes = await fetch(`${workerUrl}/api/send-connection`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            profileUrl: profileUrl.trim(),
            note: typeof note === "string" ? note.trim() : undefined,
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
        console.warn("[send-connection] Worker runner error, falling back to local:", workerErr);
        result = await sendLinkedInConnectionWithPlaywright({
          profileUrl: profileUrl.trim(),
          liAtCookie: liAt,
          jSessionId: jsessionId || undefined,
          note: typeof note === "string" ? note.trim() : undefined,
        });
      }
    } else {
      result = await sendLinkedInConnectionWithPlaywright({
        profileUrl: profileUrl.trim(),
        liAtCookie: liAt,
        jSessionId: jsessionId || undefined,
        note: typeof note === "string" ? note.trim() : undefined,
      });
    };

    if (!result.success) {
      const isAuthError = result.requiresReconnect === true;

      if (isAuthError) {
        try {
          await LinkedInConnection.updateOne(
            { id: activeConn.id },
            { $set: { status: "expired" } }
          );
        } catch {}
      }

      return NextResponse.json(
        {
          success: false,
          error: result.message,
          status: result.status,
          requiresAccountConnection: isAuthError,
          requiresReconnect: isAuthError,
          ...(isAuthError && { redirectUrl: "/dashboard/accounts?reconnect=true" }),
        },
        { status: 422 }
      );
    }

    // 4. Update lead status in Database and Workspace if lead exists
    try {
      const cleanUrl = profileUrl.trim();

      // Update Lead model if found
      if (leadId) {
        await Lead.updateOne(
          { userId: ctx.userId, _id: leadId },
          { $set: { status: "contacted" }, $push: { tags: "invited" } }
        ).catch(() => null);
      } else {
        await Lead.updateOne(
          { userId: ctx.userId, linkedinUrl: cleanUrl },
          { $set: { status: "contacted" }, $push: { tags: "invited" } }
        ).catch(() => null);
      }

      // Update CampaignLead model if campaign enrollment is specified
      if (enrollmentId) {
        await CampaignLead.updateOne(
          { userId: ctx.userId, _id: enrollmentId },
          {
            $set: { state: "invited", currentStep: 1, lastError: null },
            $push: {
              history: {
                event: "sent",
                at: new Date(),
                stepIndex: 0,
                note: typeof note === "string" && note.trim() ? `Connection request sent with note: "${note.trim()}"` : "Connection request sent without note",
              },
            },
          }
        ).catch(() => null);
      } else if (campaignId && leadId) {
        await CampaignLead.updateOne(
          { userId: ctx.userId, campaignId, leadId },
          {
            $set: { state: "invited", currentStep: 1, lastError: null },
            $push: {
              history: {
                event: "sent",
                at: new Date(),
                stepIndex: 0,
                note: typeof note === "string" && note.trim() ? `Connection request sent with note: "${note.trim()}"` : "Connection request sent without note",
              },
            },
          }
        ).catch(() => null);
      }

      // Update Workspace step3 leads array
      const workspace = await Workspace.findOne({ userId: ctx.userId });
      if (workspace?.step3?.data?.leads && Array.isArray(workspace.step3.data.leads)) {
        let changed = false;
        workspace.step3.data.leads = workspace.step3.data.leads.map((l: any) => {
          if (l.id === leadId || (l.linkedinUrl && l.linkedinUrl.includes(cleanUrl))) {
            changed = true;
            return { ...l, status: "invited" };
          }
          return l;
        });

        if (changed) {
          workspace.markModified("step3.data");
          await workspace.save();
          invalidateDbCache(ctx.userId);
        }
      }
    } catch (dbErr) {
      console.warn("Could not sync lead status to database:", dbErr);
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      message: result.message,
      recipientName: result.recipientName,
      senderAccountName: activeConn.linkedinName || "Connected LinkedIn",
    });
  } catch (err: unknown) {
    return apiError(err, "send-linkedin-connection");
  }
}
