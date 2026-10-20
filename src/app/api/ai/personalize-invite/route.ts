import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/crm";
import {
  generatePersonalizedConnectionNotes,
  type LeadProfileContext,
  type PersonalizationTone,
  type PersonalizationGoal,
} from "@/lib/ai-personalizer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      firstName,
      lastName,
      jobTitle,
      company,
      industry,
      location,
      recentPostSnippet,
      valueProposition,
      tone = "friendly",
      goal = "networking",
    } = body;

    const leadContext: LeadProfileContext = {
      firstName: typeof firstName === "string" ? firstName.trim() : undefined,
      lastName: typeof lastName === "string" ? lastName.trim() : undefined,
      jobTitle: typeof jobTitle === "string" ? jobTitle.trim() : undefined,
      company: typeof company === "string" ? company.trim() : undefined,
      industry: typeof industry === "string" ? industry.trim() : undefined,
      location: typeof location === "string" ? location.trim() : undefined,
      recentPostSnippet:
        typeof recentPostSnippet === "string" ? recentPostSnippet.trim() : undefined,
      valueProposition:
        typeof valueProposition === "string" ? valueProposition.trim() : undefined,
    };

    const validTones: PersonalizationTone[] = [
      "friendly",
      "direct",
      "consultative",
      "founder",
      "humorous",
    ];
    const validGoals: PersonalizationGoal[] = [
      "networking",
      "sales_intro",
      "partnership",
      "knowledge_share",
    ];

    const chosenTone: PersonalizationTone = validTones.includes(tone) ? tone : "friendly";
    const chosenGoal: PersonalizationGoal = validGoals.includes(goal) ? goal : "networking";

    const result = await generatePersonalizedConnectionNotes(
      leadContext,
      chosenTone,
      chosenGoal
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    return apiError(err, "ai-personalize-invite");
  }
}
