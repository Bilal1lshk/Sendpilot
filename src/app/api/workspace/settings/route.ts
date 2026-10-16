import { NextResponse } from "next/server";
import Workspace, { IWorkspace } from "@/models/Workspace";
import User from "@/models/User";
import LinkedInConnection from "@/models/LinkedInConnection";
import Lead from "@/models/Lead";
import Campaign from "@/models/Campaign";
import { requireUser, apiError } from "@/lib/crm";
import { getDbCache, setDbCache, invalidateDbCache } from "@/lib/db-cache";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ["Admin", "Member", "Viewer"] as const;
type MemberRole = (typeof VALID_ROLES)[number];

function deriveNameFromEmail(email: string): string {
  const local = (email.split("@")[0] || "member").replace(/[._-]+/g, " ");
  return local
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeRole(role?: string): MemberRole {
  if (role && (VALID_ROLES as readonly string[]).includes(role)) {
    return role as MemberRole;
  }
  return "Member";
}

async function ensureWorkspace(userId: string, userName?: string): Promise<IWorkspace> {
  let workspace = await Workspace.findOne({ userId });
  if (!workspace) {
    workspace = await Workspace.create({
      userId,
      name: userName ? `${userName}'s Workspace` : "My Workspace",
      step1: {
        status: "not_started",
        data: {
          fullName: userName || "",
          jobTitle: "",
          companyName: "",
          companyWebsite: "",
          offer: "",
          timezone: "America/New_York (Eastern Time - US)",
          workingHours: "9:00 AM - 5:00 PM (Monday - Friday)",
        },
      },
    });
  }
  return workspace;
}

async function buildSettingsPayload(workspace: IWorkspace, userId: string) {
  const [ownerUser, ownerConnections, totalLeads, totalCampaigns] = await Promise.all([
    User.findById(userId).lean(),
    LinkedInConnection.find({ userId }).lean(),
    Lead.countDocuments({ userId }),
    Campaign.countDocuments({ userId }),
  ]);

  const rawTeammates = Array.isArray(workspace.step2?.data?.invitedTeammates)
    ? workspace.step2.data.invitedTeammates
    : [];

  const invitedEmails = rawTeammates
    .map((t) => (t?.email || "").trim().toLowerCase())
    .filter(Boolean);

  const matchedUsers =
    invitedEmails.length > 0
      ? await User.find({ email: { $in: invitedEmails } }).lean()
      : [];

  const userByEmail = new Map(
    matchedUsers.map((u) => [u.email.toLowerCase(), u])
  );

  const matchedUserIds = matchedUsers.map((u) => String(u._id));
  const teammateConnections =
    matchedUserIds.length > 0
      ? await LinkedInConnection.find({ userId: { $in: matchedUserIds } }).lean()
      : [];

  const connectionsCountByUserId = new Map<string, { active: number; total: number }>();
  for (const conn of teammateConnections) {
    const uid = String(conn.userId);
    const curr = connectionsCountByUserId.get(uid) || { active: 0, total: 0 };
    curr.total += 1;
    if (conn.status === "active") curr.active += 1;
    connectionsCountByUserId.set(uid, curr);
  }

  const ownerActiveConnections = ownerConnections.filter((c) => c.status === "active").length;
  const step1Data = workspace.step1?.data || {};
  const ownerFullName =
    step1Data.fullName?.trim() || ownerUser?.name?.trim() || "Workspace Owner";
  const ownerEmail = ownerUser?.email || "";

  const ownerMember = {
    id: String(ownerUser?._id || userId),
    name: ownerFullName,
    email: ownerEmail,
    image: ownerUser?.image || null,
    jobTitle: step1Data.jobTitle || "Workspace Owner",
    role: "Owner" as const,
    status: "Active" as const,
    isOwner: true,
    isCurrentUser: true,
    invitedAt: ownerUser?.createdAt
      ? new Date(ownerUser.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Workspace Owner",
    connectedAccountsCount: ownerActiveConnections,
    totalAccountsCount: ownerConnections.length,
  };

  const teamMembers = rawTeammates
    .filter((inv) => inv && typeof inv.email === "string" && inv.email.trim())
    .map((inv) => {
      const email = inv.email.trim().toLowerCase();
      const matched = userByEmail.get(email);
      const matchedId = matched ? String(matched._id) : undefined;
      const connStats = matchedId
        ? connectionsCountByUserId.get(matchedId) || { active: 0, total: 0 }
        : { active: 0, total: 0 };

      const resolvedStatus =
        matched || inv.status === "Joined" || inv.status === "Active"
          ? "Joined"
          : "Pending";

      return {
        id: inv.id || matchedId || email,
        name: inv.name?.trim() || matched?.name || deriveNameFromEmail(email),
        email,
        image: matched?.image || null,
        jobTitle: (inv as { jobTitle?: string }).jobTitle || "",
        role: normalizeRole(inv.role),
        status: resolvedStatus as "Joined" | "Pending",
        isOwner: false,
        isCurrentUser: false,
        invitedAt: inv.invitedAt || "Recently",
        connectedAccountsCount: connStats.active,
        totalAccountsCount: connStats.total,
      };
    });

  return {
    workspaceId: String(workspace._id),
    workspaceName: workspace.name || "My Workspace",
    defaultDailyCap: Number(workspace.step4?.data?.dailyCap ?? 20),
    timezone: step1Data.timezone || "America/New_York (Eastern Time - US)",
    workingHours: step1Data.workingHours || "9:00 AM - 5:00 PM (Monday - Friday)",
    profile: {
      fullName: ownerFullName,
      email: ownerEmail,
      image: ownerUser?.image || null,
      jobTitle: step1Data.jobTitle || "",
      companyName: step1Data.companyName || "",
      companyWebsite: step1Data.companyWebsite || "",
      offer: step1Data.offer || "",
    },
    members: [ownerMember, ...teamMembers],
    stats: {
      totalLeads,
      totalCampaigns,
      connectedAccounts: ownerConnections.length,
      activeAccounts: ownerActiveConnections,
    },
    updatedAt: workspace.updatedAt,
  };
}

export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const cached = getDbCache(ctx.userId, "settings");
    if (cached) {
      return NextResponse.json({ success: true, settings: cached });
    }
    const workspace = await ensureWorkspace(ctx.userId, ctx.userName);
    const settings = await buildSettingsPayload(workspace, ctx.userId);
    setDbCache(ctx.userId, "settings", settings);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return apiError(error, "Failed to load workspace settings");
  }
}

export async function PUT(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const workspace = await ensureWorkspace(ctx.userId, ctx.userName);

    if (typeof body.workspaceName === "string" && body.workspaceName.trim()) {
      workspace.name = body.workspaceName.trim().slice(0, 80);
    }

    if (body.defaultDailyCap !== undefined) {
      const cap = Math.max(1, Math.min(100, Math.round(Number(body.defaultDailyCap) || 20)));
      workspace.step4 = {
        status: workspace.step4?.status || "not_started",
        data: {
          ...(workspace.step4?.data || {}),
          dailyCap: cap,
        },
      };
      workspace.markModified("step4");
    }

    const currentStep1Data = workspace.step1?.data || {};
    const nextStep1Data = { ...currentStep1Data };
    let step1Changed = false;

    if (typeof body.timezone === "string" && body.timezone.trim()) {
      nextStep1Data.timezone = body.timezone.trim();
      step1Changed = true;
    }

    if (typeof body.workingHours === "string" && body.workingHours.trim()) {
      nextStep1Data.workingHours = body.workingHours.trim();
      step1Changed = true;
    }

    if (body.profile && typeof body.profile === "object") {
      const p = body.profile;
      if (typeof p.fullName === "string") {
        const cleanName = p.fullName.trim().slice(0, 80);
        if (cleanName) {
          nextStep1Data.fullName = cleanName;
          step1Changed = true;
          await User.findByIdAndUpdate(ctx.userId, { name: cleanName });
        }
      }
      if (typeof p.jobTitle === "string") {
        nextStep1Data.jobTitle = p.jobTitle.trim().slice(0, 100);
        step1Changed = true;
      }
      if (typeof p.companyName === "string") {
        nextStep1Data.companyName = p.companyName.trim().slice(0, 100);
        step1Changed = true;
      }
      if (typeof p.companyWebsite === "string") {
        nextStep1Data.companyWebsite = p.companyWebsite.trim().slice(0, 160);
        step1Changed = true;
      }
      if (typeof p.offer === "string") {
        nextStep1Data.offer = p.offer.trim().slice(0, 160);
        step1Changed = true;
      }
    }

    if (step1Changed) {
      workspace.step1 = {
        status: workspace.step1?.status === "not_started" ? "completed" : workspace.step1?.status || "completed",
        data: nextStep1Data,
      };
      workspace.markModified("step1");
    }

    await workspace.save();
    invalidateDbCache(ctx.userId, ["settings", "overview", "onboarding"]);
    const settings = await buildSettingsPayload(workspace, ctx.userId);
    setDbCache(ctx.userId, "settings", settings);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return apiError(error, "Failed to save workspace settings");
  }
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const rawName = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const rawJobTitle = typeof body.jobTitle === "string" ? body.jobTitle.trim().slice(0, 100) : "";
    const role = normalizeRole(body.role);

    if (!rawEmail || !EMAIL_RE.test(rawEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const [workspace, ownerUser, existingUser] = await Promise.all([
      ensureWorkspace(ctx.userId, ctx.userName),
      User.findById(ctx.userId).lean(),
      User.findOne({ email: rawEmail }).lean(),
    ]);

    if (ownerUser?.email?.toLowerCase() === rawEmail) {
      return NextResponse.json(
        { success: false, error: "You are already the workspace owner." },
        { status: 400 }
      );
    }

    const existingList = Array.isArray(workspace.step2?.data?.invitedTeammates)
      ? [...workspace.step2.data.invitedTeammates]
      : [];

    if (existingList.some((m) => (m?.email || "").trim().toLowerCase() === rawEmail)) {
      return NextResponse.json(
        { success: false, error: "This member has already been invited to the workspace." },
        { status: 409 }
      );
    }

    const newMember = {
      id: existingUser ? String(existingUser._id) : `member_${Date.now()}`,
      name: rawName || existingUser?.name || deriveNameFromEmail(rawEmail),
      email: rawEmail,
      jobTitle: rawJobTitle,
      role,
      invitedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: existingUser ? "Joined" : "Pending",
    };

    existingList.push(newMember);

    workspace.step2 = {
      status: workspace.step2?.status === "not_started" ? "completed" : workspace.step2?.status || "completed",
      data: {
        connectedAccounts: workspace.step2?.data?.connectedAccounts || [],
        invitedTeammates: existingList,
      },
    };
    workspace.markModified("step2");
    await workspace.save();

    invalidateDbCache(ctx.userId, ["settings", "overview", "onboarding"]);
    const settings = await buildSettingsPayload(workspace, ctx.userId);
    setDbCache(ctx.userId, "settings", settings);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return apiError(error, "Failed to invite workspace member");
  }
}

export async function PATCH(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const targetEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const workspace = await ensureWorkspace(ctx.userId, ctx.userName);
    const ownerUser = await User.findById(ctx.userId).lean();

    if (body.isOwner || (targetEmail && ownerUser?.email?.toLowerCase() === targetEmail)) {
      // Updating owner member info
      const nextStep1Data = { ...(workspace.step1?.data || {}) };
      if (typeof body.name === "string" && body.name.trim()) {
        const cleanName = body.name.trim().slice(0, 80);
        nextStep1Data.fullName = cleanName;
        await User.findByIdAndUpdate(ctx.userId, { name: cleanName });
      }
      if (typeof body.jobTitle === "string") {
        nextStep1Data.jobTitle = body.jobTitle.trim().slice(0, 100);
      }
      workspace.step1 = {
        status: workspace.step1?.status || "completed",
        data: nextStep1Data,
      };
      workspace.markModified("step1");
      await workspace.save();
      invalidateDbCache(ctx.userId, ["settings", "overview", "onboarding"]);
      const settings = await buildSettingsPayload(workspace, ctx.userId);
      setDbCache(ctx.userId, "settings", settings);
      return NextResponse.json({ success: true, settings });
    }

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: "Member email is required." },
        { status: 400 }
      );
    }

    const existingList = Array.isArray(workspace.step2?.data?.invitedTeammates)
      ? [...workspace.step2.data.invitedTeammates]
      : [];

    const idx = existingList.findIndex(
      (m) => (m?.email || "").trim().toLowerCase() === targetEmail
    );

    if (idx === -1) {
      return NextResponse.json(
        { success: false, error: "Member not found in workspace." },
        { status: 404 }
      );
    }

    const current = existingList[idx];
    existingList[idx] = {
      ...current,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : current.name,
      jobTitle: typeof body.jobTitle === "string" ? body.jobTitle.trim().slice(0, 100) : current.jobTitle,
      role: body.role ? normalizeRole(body.role) : normalizeRole(current.role),
      status:
        body.status === "Joined" || body.status === "Pending"
          ? body.status
          : current.status,
    };

    workspace.step2 = {
      status: workspace.step2?.status || "completed",
      data: {
        connectedAccounts: workspace.step2?.data?.connectedAccounts || [],
        invitedTeammates: existingList,
      },
    };
    workspace.markModified("step2");
    await workspace.save();

    invalidateDbCache(ctx.userId, ["settings", "overview", "onboarding"]);
    const settings = await buildSettingsPayload(workspace, ctx.userId);
    setDbCache(ctx.userId, "settings", settings);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return apiError(error, "Failed to update workspace member");
  }
}

export async function DELETE(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(req.url);
    let targetEmail = (searchParams.get("email") || "").trim().toLowerCase();

    if (!targetEmail) {
      const body = await req.json().catch(() => ({}));
      if (typeof body.email === "string") {
        targetEmail = body.email.trim().toLowerCase();
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: "Member email is required to remove." },
        { status: 400 }
      );
    }

    const workspace = await ensureWorkspace(ctx.userId, ctx.userName);
    const existingList = Array.isArray(workspace.step2?.data?.invitedTeammates)
      ? workspace.step2.data.invitedTeammates
      : [];

    const filtered = existingList.filter(
      (m) => (m?.email || "").trim().toLowerCase() !== targetEmail
    );

    workspace.step2 = {
      status: workspace.step2?.status || "completed",
      data: {
        connectedAccounts: workspace.step2?.data?.connectedAccounts || [],
        invitedTeammates: filtered,
      },
    };
    workspace.markModified("step2");
    await workspace.save();

    invalidateDbCache(ctx.userId, ["settings", "overview", "onboarding"]);
    const settings = await buildSettingsPayload(workspace, ctx.userId);
    setDbCache(ctx.userId, "settings", settings);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return apiError(error, "Failed to remove workspace member");
  }
}
