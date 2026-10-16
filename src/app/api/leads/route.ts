import { NextResponse } from "next/server";
import Lead, { LEAD_STATUSES, LEAD_SOURCES } from "@/models/Lead";
import CampaignLead from "@/models/CampaignLead";
import { requireUser, importLeads, serializeLead, toLeadSource, apiError, isValidObjectId } from "@/lib/crm";
import { getDbCache, setDbCache, invalidateDbCache } from "@/lib/db-cache";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/leads?q=&status=&source=&tag=&sample=include|exclude|only&page=1&limit=25
 */
export async function GET(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(req.url);
    const cacheSubKey = searchParams.toString() || "default";
    const cached = getDbCache<Record<string, unknown>>(ctx.userId, "leads", cacheSubKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const tag = searchParams.get("tag");
    const sample = searchParams.get("sample") || "include";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 25));

    const filter: Record<string, any> = { userId: ctx.userId };
    if (status && (LEAD_STATUSES as readonly string[]).includes(status)) filter.status = status;
    if (source && (LEAD_SOURCES as readonly string[]).includes(source)) filter.source = source;
    if (tag) filter.tags = tag;
    if (sample === "exclude") filter.isSample = { $ne: true };
    if (sample === "only") filter.isSample = true;
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ firstName: rx }, { lastName: rx }, { company: rx }, { title: rx }, { email: rx }, { location: rx }];
    }

    const [items, total, statusCounts, tags] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Lead.countDocuments(filter),
      Lead.aggregate([{ $match: { userId: ctx.userId } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
      Lead.distinct("tags", { userId: ctx.userId }),
    ]);

    // Which campaigns each lead on this page is enrolled in
    const enrollments = await CampaignLead.find(
      { userId: ctx.userId, leadId: { $in: items.map((i) => i._id) } },
      { leadId: 1, campaignId: 1, state: 1 }
    ).lean();
    const byLead = new Map<string, { campaignId: string; state: string }[]>();
    for (const e of enrollments) {
      const k = String(e.leadId);
      if (!byLead.has(k)) byLead.set(k, []);
      byLead.get(k)!.push({ campaignId: String(e.campaignId), state: e.state });
    }

    const counts: Record<string, number> = { all: 0 };
    for (const s of statusCounts) {
      counts[s._id] = s.n;
      counts.all += s.n;
    }

    const payload = {
      success: true,
      leads: items.map((l) => ({ ...serializeLead(l), campaigns: byLead.get(String(l._id)) || [] })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      counts,
      tags: (tags as string[]).sort(),
    };

    setDbCache(ctx.userId, "leads", payload, cacheSubKey);
    return NextResponse.json(payload);
  } catch (error) {
    return apiError(error, "Failed to fetch leads");
  }
}

/** POST /api/leads  { leads: RawLeadInput[], importType?: "csv" | "linkedin_search" | "profile" | "manual" } */
export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const leads = Array.isArray(body.leads) ? body.leads : body.lead ? [body.lead] : [];
    if (leads.length === 0) {
      return NextResponse.json({ success: false, error: "No leads provided" }, { status: 400 });
    }
    if (leads.length > 5000) {
      return NextResponse.json({ success: false, error: "Max 5000 leads per import" }, { status: 400 });
    }

    const result = await importLeads(ctx.userId, leads, toLeadSource(body.importType || body.source));
    const totalCount = await Lead.countDocuments({ userId: ctx.userId });
    invalidateDbCache(ctx.userId, ["leads", "overview", "settings", "campaigns"]);

    return NextResponse.json({
      success: true,
      importedCount: result.imported,
      duplicatesSkipped: result.duplicates,
      invalidSkipped: result.invalid,
      totalCount,
      leads: result.leads.map(serializeLead),
    });
  } catch (error) {
    return apiError(error, "Failed to import leads");
  }
}

/**
 * DELETE /api/leads            body { ids: string[] }  → delete selected
 * DELETE /api/leads?all=true                          → delete every lead for the user
 * DELETE /api/leads?id=...                            → legacy single delete
 */
export async function DELETE(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    let ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const single = searchParams.get("id");
    if (single) ids.push(single);
    ids = ids.filter(isValidObjectId);

    const deleteAll = searchParams.get("all") === "true" || (!single && ids.length === 0 && !Array.isArray(body.ids));

    const filter: Record<string, any> = { userId: ctx.userId };
    if (!deleteAll) {
      if (ids.length === 0) return NextResponse.json({ success: false, error: "No valid lead ids" }, { status: 400 });
      filter._id = { $in: ids };
    }

    const targetIds = deleteAll ? undefined : ids;
    const { deletedCount } = await Lead.deleteMany(filter);
    await CampaignLead.deleteMany(
      targetIds ? { userId: ctx.userId, leadId: { $in: targetIds } } : { userId: ctx.userId }
    );
    const remainingCount = await Lead.countDocuments({ userId: ctx.userId });
    invalidateDbCache(ctx.userId, ["leads", "overview", "settings", "campaigns"]);

    return NextResponse.json({ success: true, deletedCount, remainingCount });
  } catch (error) {
    return apiError(error, "Failed to delete lead(s)");
  }
}
