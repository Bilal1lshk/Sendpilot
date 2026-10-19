export type PersonalizationTone =
  | "friendly"
  | "direct"
  | "consultative"
  | "founder"
  | "humorous";

export type PersonalizationGoal =
  | "networking"
  | "sales_intro"
  | "partnership"
  | "knowledge_share";

export interface LeadProfileContext {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  location?: string;
  skills?: string[];
  recentPostSnippet?: string;
  aboutSnippet?: string;
  mutualConnectionsCount?: number;
  valueProposition?: string;
}

export interface GeneratedNoteOption {
  angle: string;
  note: string;
  characterCount: number;
  tone: PersonalizationTone;
}

export interface PersonalizationResult {
  success: boolean;
  notes: GeneratedNoteOption[];
  leadName: string;
  modelUsed: string;
  error?: string;
}

const LINKEDIN_NOTE_LIMIT = 300;

function trimToLimit(text: string, limit = LINKEDIN_NOTE_LIMIT): string {
  let clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= limit) return clean;

  // Trim to last complete word before limit
  clean = clean.slice(0, limit - 1);
  const lastSpace = clean.lastIndexOf(" ");
  if (lastSpace > limit * 0.75) {
    clean = clean.slice(0, lastSpace);
  }
  // Ensure punctuation ending
  if (!/[.!?]$/.test(clean)) {
    clean += ".";
  }
  return clean.slice(0, limit);
}

/**
 * Intelligent built-in rule and template engine that creates high-converting,
 * natural LinkedIn connection notes when no external LLM API key is present.
 */
function generateHeuristicNotes(
  lead: LeadProfileContext,
  tone: PersonalizationTone = "friendly",
  goal: PersonalizationGoal = "networking"
): GeneratedNoteOption[] {
  const firstName = lead.firstName?.trim() || "there";
  const title = lead.jobTitle?.trim() || "leader";
  const company = lead.company?.trim() || "your team";
  const industry = lead.industry?.trim() || "tech";
  const offering =
    lead.valueProposition?.trim() ||
    "automated LinkedIn pipeline workflows and AI lead scoring";

  const options: GeneratedNoteOption[] = [];

  // Angle 1: Observation & Value Exchange
  let note1 = "";
  if (tone === "direct") {
    note1 = `Hi ${firstName}, noticed your role as ${title} at ${company}. We help ${industry} teams streamline ${offering}. Thought I'd reach out directly to connect and exchange notes!`;
  } else if (tone === "consultative") {
    note1 = `Hi ${firstName}, following ${company}'s progress in ${industry}. As ${title}, are you exploring new ways to accelerate ${offering}? Would love to connect and follow your updates.`;
  } else if (tone === "founder") {
    note1 = `Hey ${firstName}, fellow builder here. Really impressed by what ${company} is building in ${industry}. Would love to connect and share learnings on scaling teams.`;
  } else {
    note1 = `Hi ${firstName}, saw your execution as ${title} at ${company}. Love what you are building in ${industry} and would love to connect to follow your journey!`;
  }

  // Angle 2: Recent Activity / Industry Insight
  let note2 = "";
  if (lead.recentPostSnippet) {
    const postBrief = lead.recentPostSnippet.slice(0, 50).trim();
    note2 = `Hi ${firstName}, really enjoyed your recent point on "${postBrief}...". Thought it'd be great to connect here on LinkedIn and keep in touch!`;
  } else if (lead.mutualConnectionsCount && lead.mutualConnectionsCount > 3) {
    note2 = `Hey ${firstName}, noticed we share mutual connections in the ${industry} space. As ${title} at ${company}, thought it would be great to connect directly!`;
  } else if (tone === "direct") {
    note2 = `Hi ${firstName}, keeping it brief—respect what you're leading at ${company}. Would love to connect and see if our work with ${industry} leaders is relevant to you.`;
  } else {
    note2 = `Hi ${firstName}, always looking to connect with top ${title}s in ${industry}. Would love to add you to my professional network and follow ${company}'s milestones!`;
  }

  // Angle 3: Low-Pressure Peer Connection
  let note3 = "";
  if (tone === "humorous") {
    note3 = `Hi ${firstName}, promise this isn't another generic pitch! Saw your work as ${title} at ${company} and genuinely wanted to connect with fellow folks in ${industry}.`;
  } else if (goal === "sales_intro") {
    note3 = `Hi ${firstName}, loved your focus on ${title} at ${company}. We put together a lightweight benchmark on ${industry} outbound efficiency—would love to share it with you!`;
  } else {
    note3 = `Hi ${firstName}, quick hello from across the ${industry} space. Love following innovative teams like ${company}—hoping to connect here on LinkedIn!`;
  }

  [note1, note2, note3].forEach((rawNote, idx) => {
    const finalized = trimToLimit(rawNote);
    const angleNames = [
      "Value & Peer Observation",
      "Industry Alignment",
      "Low-Pressure Network",
    ];
    options.push({
      angle: angleNames[idx],
      note: finalized,
      characterCount: finalized.length,
      tone,
    });
  });

  return options;
}

/**
 * Attempts to generate hyper-personalized notes using OpenAI if OPENAI_API_KEY is configured.
 */
async function generateViaOpenAI(
  apiKey: string,
  lead: LeadProfileContext,
  tone: PersonalizationTone,
  goal: PersonalizationGoal
): Promise<GeneratedNoteOption[] | null> {
  try {
    const prompt = `You are an elite LinkedIn outreach copywriter. Write 3 distinct personalized LinkedIn connection request notes for:
Name: ${lead.firstName || ""} ${lead.lastName || ""}
Job Title: ${lead.jobTitle || "Professional"}
Company: ${lead.company || "Company"}
Industry: ${lead.industry || "B2B"}
Value/Offering: ${lead.valueProposition || "Growth & outbound pipeline"}
Desired Tone: ${tone}
Outreach Goal: ${goal}

RULES:
1. Every note MUST be under 280 characters (LinkedIn hard limit is 300).
2. Sound conversational, genuine, and human. Avoid generic buzzwords like "synergies" or "streamline".
3. Return ONLY a valid JSON array of 3 objects with properties: "angle" (string), "note" (string).`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    const parsed = JSON.parse(rawContent);
    const list = Array.isArray(parsed) ? parsed : parsed.notes || parsed.options || [];

    if (Array.isArray(list) && list.length > 0) {
      return list.map((item: { angle?: string; note?: string }) => {
        const note = trimToLimit(item.note || "");
        return {
          angle: item.angle || "AI Personalized",
          note,
          characterCount: note.length,
          tone,
        };
      });
    }
  } catch (err) {
    console.warn("[ai-personalizer] OpenAI generation fallback:", err);
  }
  return null;
}

/**
 * Main public entrypoint: Generates 3 personalized <300-char LinkedIn connection notes
 * for any lead profile. Uses OpenAI when configured, or the built-in intelligent NLP heuristic.
 */
export async function generatePersonalizedConnectionNotes(
  lead: LeadProfileContext,
  tone: PersonalizationTone = "friendly",
  goal: PersonalizationGoal = "networking"
): Promise<PersonalizationResult> {
  const leadName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Prospect";
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (openaiKey) {
    const aiNotes = await generateViaOpenAI(openaiKey, lead, tone, goal);
    if (aiNotes && aiNotes.length > 0) {
      return {
        success: true,
        notes: aiNotes,
        leadName,
        modelUsed: "gpt-4o-mini",
      };
    }
  }

  // Fallback to high-converting built-in engine
  const fallbackNotes = generateHeuristicNotes(lead, tone, goal);
  return {
    success: true,
    notes: fallbackNotes,
    leadName,
    modelUsed: "sendpilot-heuristic-engine",
  };
}
