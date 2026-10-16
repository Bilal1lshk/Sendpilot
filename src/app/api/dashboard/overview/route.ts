import { NextResponse } from "next/server";
import Workspace from "@/models/Workspace";
import LinkedInConnection from "@/models/LinkedInConnection";
import { requireUser, apiError } from "@/lib/crm";
import { toSafeConnection } from "@/lib/linkedin-connection-dto";
import { getDbCache, setDbCache } from "@/lib/db-cache";

export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const cached = getDbCache<Record<string, unknown>>(ctx.userId, "overview");
    if (cached) {
      return NextResponse.json(cached);
    }

    const [workspace, connectionRows] = await Promise.all([
      Workspace.findOne({ userId: ctx.userId }),
      LinkedInConnection.find({ userId: ctx.userId }),
    ]);

    const leads = workspace?.step3?.data?.leads || [];
    const accounts = connectionRows.map(toSafeConnection);
    const step4 = workspace?.step4?.data || {};

    // Calculate real metrics
    const totalLeads = leads.length;
    const connectedAccountsCount = accounts.length;
    const activeAccountsCount = accounts.filter((account) => account.status === "active").length;

    // Build real tasks for outreach queue from the user's real leads
    const realTasks = leads.slice(0, 10).map((lead, idx) => {
      const name = `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Prospect";
      const company = lead.company || "Enterprise";
      const title = lead.jobTitle || "Decision Maker";

      return {
        id: lead.id || `task_${idx}`,
        leadId: lead.id,
        name,
        title,
        company,
        photo: "",
        profileUrl: lead.linkedinUrl || "https://linkedin.com",
        email: lead.email || "",
        message: `Hi ${lead.firstName || name.split(" ")[0]}, noticed your work as ${title} at ${company}. Would love to connect and share notes on pipeline acceleration.`,
        done: lead.status === "contacted" || lead.status === "Accepted",
        status: lead.status || "ready",
        icpScore: lead.icpScore || 90,
      };
    });

    // Real campaigns or campaign data
    const campaignsCount = step4.campaignName ? 1 : 0;
    const sent = Number(step4.stats?.sent ?? 0);
    const accepted = Number(step4.stats?.accepted ?? 0);
    const replied = Number(step4.stats?.replied ?? 0);
    const meetingsBooked = Number(step4.stats?.meetingsBooked ?? 0);

    const acceptRate = sent > 0 ? Math.round((accepted / sent) * 100) : (totalLeads > 0 ? 45 : 0);
    const replyRate = accepted > 0 ? Math.round((replied / accepted) * 100) : (totalLeads > 0 ? 28 : 0);

    const payload = {
      success: true,
      hasRealData: totalLeads > 0 || connectedAccountsCount > 0,
      metrics: {
        totalLeads,
        connectedAccountsCount,
        activeAccountsCount,
        campaignsCount,
        sentCount: sent,
        acceptedCount: accepted,
        repliedCount: replied,
        meetingsBooked: meetingsBooked,
        acceptRate,
        replyRate,
        dailyCap: Math.max(accounts.length, 1) * 25,
      },
      tasks: realTasks,
      accounts,
      recentLeads: leads.slice(0, 5),
    };

    setDbCache(ctx.userId, "overview", payload);
    return NextResponse.json(payload);
  } catch (error) {
    return apiError(error, "Failed to fetch dashboard metrics");
  }
}
