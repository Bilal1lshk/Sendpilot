import { NextResponse } from "next/server";
import AutomationFlow from "@/models/AutomationFlow";
import { requireUser, apiError, sanitizeSteps } from "@/lib/crm";

const DEFAULT_AUTOMATION_TEMPLATES = [
  {
    id: "tpl_warm_connection",
    name: "Warm Connection & Value Follow-Up",
    description: "Connect with a personalized observation, wait 2 days, then send a value-first question.",
    isTemplate: true,
    steps: [
      {
        type: "connect" as const,
        delayDays: 0,
        template:
          "Hey {{firstName}}, noticed {{company}} navigating outbound growth. Love what you're building — would be great to connect!",
      },
      {
        type: "wait" as const,
        delayDays: 2,
        template: "",
      },
      {
        type: "message" as const,
        delayDays: 0,
        template:
          "Thanks for connecting, {{firstName}}! Curious how {{company}} is tackling outbound reply rates this quarter?",
      },
      {
        type: "wait" as const,
        delayDays: 3,
        template: "",
      },
      {
        type: "message" as const,
        delayDays: 0,
        template:
          "Quick follow-up {{firstName}} — would you be open to a 10-minute chat later this week to compare notes? No pressure at all!",
      },
    ],
  },
  {
    id: "tpl_direct_pitch",
    name: "Direct Problem-Solution Pitch",
    description: "Clear, zero-fluff outreach for busy executives and decision makers.",
    isTemplate: true,
    steps: [
      {
        type: "connect" as const,
        delayDays: 0,
        template:
          "Hi {{firstName}}, we built a lightweight pipeline tool for {{company}} to scale qualified meetings with zero spam. Open to connecting?",
      },
      {
        type: "wait" as const,
        delayDays: 2,
        template: "",
      },
      {
        type: "message" as const,
        delayDays: 0,
        template:
          "Hey {{firstName}}, would adding 10-15 qualified meetings this month make a noticeable impact for {{company}}?",
      },
      {
        type: "wait" as const,
        delayDays: 3,
        template: "",
      },
      {
        type: "message" as const,
        delayDays: 0,
        template:
          "{{firstName}}, happy to drop a 2-minute video walkthrough showing how similar teams double pipeline if you're curious.",
      },
    ],
  },
  {
    id: "tpl_consultative",
    name: "Consultative Peer Diagnostic",
    description: "Strategic inquiry asking about team bottlenecks and industry conversion shifts.",
    isTemplate: true,
    steps: [
      {
        type: "connect" as const,
        delayDays: 0,
        template:
          "Hi {{firstName}}, tracking outbound conversion shifts across B2B teams. Noticed your leadership at {{company}} and would love to exchange perspectives!",
      },
      {
        type: "wait" as const,
        delayDays: 2,
        template: "",
      },
      {
        type: "message" as const,
        delayDays: 0,
        template:
          "Appreciate the connect, {{firstName}}. What's the bigger priority for {{company}} right now: increasing lead volume or improving meeting show-up rates?",
      },
    ],
  },
];

/**
 * GET /api/flows
 * Returns user's custom saved automation flows + built-in template flows.
 */
export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const userFlows = await AutomationFlow.find({ userId: ctx.userId })
      .sort({ updatedAt: -1 })
      .lean();

    const formattedUserFlows = userFlows.map((f) => ({
      id: String(f._id),
      name: f.name,
      description: f.description || "",
      steps: f.steps,
      config: f.config || {},
      isTemplate: false,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      flows: formattedUserFlows,
      templates: DEFAULT_AUTOMATION_TEMPLATES,
    });
  } catch (error) {
    return apiError(error, "Failed to fetch automation flows");
  }
}

/**
 * POST /api/flows
 * Creates a new reusable automation flow.
 * Body: { name: string, description?: string, steps: ICampaignStep[], config?: Record<string, any> }
 */
export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Flow name is required" }, { status: 400 });
    }

    const steps = sanitizeSteps(body.steps);
    if (!steps || steps.length === 0) {
      return NextResponse.json(
        { success: false, error: "Flow must have at least one valid sequence step" },
        { status: 400 }
      );
    }

    // Must have at least one actionable step (connect or message)
    const hasAction = steps.some((s) => s.type === "connect" || s.type === "message");
    if (!hasAction) {
      return NextResponse.json(
        { success: false, error: "Flow must contain at least one connection request or message step" },
        { status: 400 }
      );
    }

    const config = body.config && typeof body.config === "object" ? body.config : {};

    const flow = await AutomationFlow.create({
      userId: ctx.userId,
      name,
      description: String(body.description || "").trim(),
      steps,
      config,
      isTemplate: false,
    });

    return NextResponse.json({
      success: true,
      flow: {
        id: String(flow._id),
        name: flow.name,
        description: flow.description,
        steps: flow.steps,
        config: flow.config || {},
        isTemplate: false,
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
      },
    });
  } catch (error) {
    return apiError(error, "Failed to create automation flow");
  }
}
