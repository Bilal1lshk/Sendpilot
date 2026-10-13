import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import Workspace from "@/models/Workspace";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";

    await connectDB();
    const workspace = await Workspace.findOne({ userId });

    const leads = workspace?.step3?.data?.leads || [];
    return NextResponse.json({
      success: true,
      total: leads.length,
      leads,
    });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";

    const body = await req.json().catch(() => ({}));
    const { leads = [], importType = "csv" } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "No leads provided in request payload" },
        { status: 400 }
      );
    }

    await connectDB();
    let workspace = await Workspace.findOne({ userId });

    if (!workspace) {
      workspace = new Workspace({
        userId,
        name: session?.user?.name ? `${session.user.name}'s Workspace` : "My Workspace",
      });
    }

    if (!workspace.step3) {
      workspace.step3 = {
        status: "completed",
        data: { leads: [], readyCount: 0, importType },
      };
    }
    if (!workspace.step3.data) {
      workspace.step3.data = { leads: [], readyCount: 0, importType };
    }

    const existingLeads = workspace.step3.data.leads || [];
    const existingEmails = new Set(
      existingLeads.map((l: any) => l.email?.toLowerCase().trim()).filter(Boolean)
    );
    const existingUrls = new Set(
      existingLeads.map((l: any) => l.linkedinUrl?.toLowerCase().trim()).filter(Boolean)
    );

    const formattedNewLeads: any[] = [];
    let duplicatesSkipped = 0;

    for (const lead of leads) {
      const email = lead.email?.toLowerCase().trim() || "";
      const url = lead.linkedinUrl?.toLowerCase().trim() || "";

      if ((email && existingEmails.has(email)) || (url && existingUrls.has(url))) {
        duplicatesSkipped++;
        continue;
      }

      if (email) existingEmails.add(email);
      if (url) existingUrls.add(url);

      formattedNewLeads.push({
        id: lead.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        firstName: lead.firstName || lead.name?.split(" ")[0] || "Prospect",
        lastName: lead.lastName || lead.name?.split(" ").slice(1).join(" ") || "",
        jobTitle: lead.jobTitle || lead.title || "Decision Maker",
        company: lead.company || "Enterprise",
        email: lead.email || "",
        linkedinUrl: lead.linkedinUrl || "",
        icpScore: Number(lead.icpScore) || 85,
        status: lead.status || "ready",
      });
    }

    workspace.step3.data.leads = [...formattedNewLeads, ...existingLeads];
    workspace.step3.data.readyCount = workspace.step3.data.leads.length;
    workspace.step3.data.importType = importType;
    workspace.step3.status = "completed";
    workspace.markModified("step3.data");

    await workspace.save();

    return NextResponse.json({
      success: true,
      importedCount: formattedNewLeads.length,
      duplicatesSkipped,
      totalCount: workspace.step3.data.leads.length,
      leads: workspace.step3.data.leads,
    });
  } catch (error: any) {
    console.error("Error importing leads:", error);
    return NextResponse.json(
      { error: "Failed to import leads", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-workspace";
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("id");

    await connectDB();
    const workspace = await Workspace.findOne({ userId });

    if (!workspace || !workspace.step3?.data?.leads) {
      return NextResponse.json({ success: true, count: 0 });
    }

    if (leadId) {
      workspace.step3.data.leads = workspace.step3.data.leads.filter(
        (l: any) => l.id !== leadId
      );
    } else {
      workspace.step3.data.leads = [];
    }

    workspace.step3.data.readyCount = workspace.step3.data.leads.length;
    workspace.markModified("step3.data");
    await workspace.save();

    return NextResponse.json({
      success: true,
      remainingCount: workspace.step3.data.leads.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to delete lead(s)", message: error.message },
      { status: 500 }
    );
  }
}
