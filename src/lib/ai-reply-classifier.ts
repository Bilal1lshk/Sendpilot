export type ReplyCategory =
  | "interested"
  | "objection"
  | "question"
  | "not_interested"
  | "out_of_office";

export type ReplySentiment = "positive" | "neutral" | "negative";

export interface ReplyClassificationResult {
  category: ReplyCategory;
  sentiment: ReplySentiment;
  confidence: number;
  summary: string;
  suggestedAction:
    | "book_meeting"
    | "send_info"
    | "handle_objection"
    | "pause_sequence"
    | "follow_up_later";
  quickDrafts: Array<{
    title: string;
    text: string;
    actionType: string;
  }>;
  detectedObjection?: string;
  modelUsed: string;
}

export interface ClassifyReplyOptions {
  messageText: string;
  leadName?: string;
  companyName?: string;
  previousOutreachSnippet?: string;
  calendarLink?: string;
}

/**
 * Built-in NLP semantic classifier: evaluates inbound LinkedIn messages using
 * weighted intent heuristics when no external LLM key is configured.
 */
function classifyHeuristically(options: ClassifyReplyOptions): ReplyClassificationResult {
  const text = options.messageText.toLowerCase().trim();
  const leadFirstName = options.leadName?.split(" ")[0]?.trim() || "there";
  const calLink = options.calendarLink || "cal.com/your-team";

  // 1. Out of Office check
  if (
    text.includes("out of the office") ||
    text.includes("out of office") ||
    text.includes("on vacation") ||
    text.includes("away from my desk") ||
    text.includes("on leave") ||
    text.includes("auto-reply") ||
    text.includes("automated response")
  ) {
    return {
      category: "out_of_office",
      sentiment: "neutral",
      confidence: 0.95,
      summary: "Automated out-of-office or vacation notice.",
      suggestedAction: "follow_up_later",
      quickDrafts: [
        {
          title: "Acknowledge & Snooze",
          text: `Thanks for letting me know, ${leadFirstName}! Hope you have a restful time off—I'll circle back once you're back in office.`,
          actionType: "snooze",
        },
      ],
      modelUsed: "sendpilot-heuristic-classifier",
    };
  }

  // 2. Negative / Unsubscribe check
  if (
    text.includes("not interested") ||
    text.includes("no thanks") ||
    text.includes("no thank you") ||
    text.includes("unsubscribe") ||
    text.includes("remove me") ||
    text.includes("stop messaging") ||
    text.includes("please stop") ||
    text.includes("don't contact") ||
    text.includes("dont contact")
  ) {
    return {
      category: "not_interested",
      sentiment: "negative",
      confidence: 0.92,
      summary: "Prospect declined or opted out. Recommended to pause outreach.",
      suggestedAction: "pause_sequence",
      quickDrafts: [
        {
          title: "Polite Sign-Off (Recommended)",
          text: `Understood completely, ${leadFirstName}! Thanks for letting me know, and wishing you and the team continued success.`,
          actionType: "opt_out",
        },
      ],
      modelUsed: "sendpilot-heuristic-classifier",
    };
  }

  // 3. Positive / Interested check
  const interestSignals = [
    "interested",
    "sounds good",
    "sounds interesting",
    "tell me more",
    "happy to chat",
    "open to chat",
    "let's talk",
    "lets talk",
    "send over details",
    "send me details",
    "send info",
    "share more",
    "hop on a call",
    "book a time",
    "set up a call",
    "schedule a time",
    "pricing",
    "how much",
    "cost",
  ];
  const hasInterest = interestSignals.some((sig) => text.includes(sig));

  if (hasInterest) {
    return {
      category: "interested",
      sentiment: "positive",
      confidence: 0.88,
      summary: "Prospect expressed interest or requested more details/meeting.",
      suggestedAction: "book_meeting",
      quickDrafts: [
        {
          title: "Direct Calendar Booking",
          text: `Great to hear from you, ${leadFirstName}! Would Tuesday or Wednesday afternoon work for a quick 10-minute overview? You can also grab whatever time suits you best here: ${calLink}`,
          actionType: "calendar_link",
        },
        {
          title: "Brief Overview First",
          text: `Glad this resonates, ${leadFirstName}! In short, we help teams automate LinkedIn sequences with AI personalization and human safety controls. Are you free for a brief 10-min chat later this week?`,
          actionType: "overview",
        },
      ],
      modelUsed: "sendpilot-heuristic-classifier",
    };
  }

  // 4. Objection handling check
  const objectionSignals = [
    "too busy",
    "bad timing",
    "next quarter",
    "q1",
    "q2",
    "q3",
    "q4",
    "next year",
    "already have",
    "already using",
    "we use",
    "not the right person",
    "no budget",
    "can't afford",
  ];
  const hasObjection = objectionSignals.some((sig) => text.includes(sig));

  if (hasObjection) {
    let objectionType = "General Timing";
    if (text.includes("not the right person")) objectionType = "Wrong Contact / Referral";
    if (text.includes("already using") || text.includes("we use")) objectionType = "Existing Competitor";
    if (text.includes("busy") || text.includes("timing") || text.includes("quarter")) objectionType = "Timing Delay";

    return {
      category: "objection",
      sentiment: "neutral",
      confidence: 0.84,
      summary: `Prospect raised an objection: ${objectionType}.`,
      detectedObjection: objectionType,
      suggestedAction: "handle_objection",
      quickDrafts: [
        {
          title: "Soft Follow-Up Permission",
          text: `Completely understand, ${leadFirstName}—timing is everything! Mind if I check back in with you in a couple of months to see how things are progressing?`,
          actionType: "nurture",
        },
        {
          title: "Referral Ask",
          text: `Thanks for the quick note, ${leadFirstName}! Is there someone else on your team currently leading these initiatives who might be the best person to speak with?`,
          actionType: "referral",
        },
      ],
      modelUsed: "sendpilot-heuristic-classifier",
    };
  }

  // 5. Question check
  const isQuestion = text.includes("?") || text.startsWith("how") || text.startsWith("what") || text.startsWith("does");

  return {
    category: isQuestion ? "question" : "interested",
    sentiment: "neutral",
    confidence: 0.75,
    summary: isQuestion
      ? "Prospect asked a question regarding your product or offering."
      : "Prospect replied with a neutral conversational message.",
    suggestedAction: "send_info",
    quickDrafts: [
      {
        title: "Answer & Call to Action",
        text: `Hi ${leadFirstName}, great question! We integrate directly with active LinkedIn sessions and CRM webhooks. Would you be open to a quick 10-minute demo to see it in action?`,
        actionType: "answer",
      },
      {
        title: "Conversational Follow-Up",
        text: `Hi ${leadFirstName}, thanks for getting back to me! Happy to share a quick 2-minute walkthrough video or trade notes whenever convenient for you.`,
        actionType: "video_link",
      },
    ],
    modelUsed: "sendpilot-heuristic-classifier",
  };
}

/**
 * Classifies an inbound reply using OpenAI when OPENAI_API_KEY is configured.
 */
async function classifyViaOpenAI(
  apiKey: string,
  options: ClassifyReplyOptions
): Promise<ReplyClassificationResult | null> {
  try {
    const prompt = `You are an elite sales development AI assistant analyzing an incoming LinkedIn reply.
Prospect Name: ${options.leadName || "Prospect"}
Prospect Company: ${options.companyName || "Company"}
Inbound Message: "${options.messageText}"
Calendar Booking Link: ${options.calendarLink || "cal.com/your-team"}

Categorize this reply into strictly one of:
- "interested" (wants demo, pricing, call, or information)
- "objection" (timing issue, wrong person, competitor, budget)
- "question" (asking how it works or technical details)
- "not_interested" (explicitly declined or unsubscribed)
- "out_of_office" (automated OOO or vacation reply)

Return ONLY valid JSON matching this schema:
{
  "category": "interested" | "objection" | "question" | "not_interested" | "out_of_office",
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": number between 0 and 1,
  "summary": "1 sentence explanation",
  "suggestedAction": "book_meeting" | "send_info" | "handle_objection" | "pause_sequence" | "follow_up_later",
  "detectedObjection": "optional short description",
  "quickDrafts": [
    {
      "title": "short label",
      "text": "complete conversational response ready to send",
      "actionType": "string"
    }
  ]
}`;

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
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      category: parsed.category || "interested",
      sentiment: parsed.sentiment || "neutral",
      confidence: parsed.confidence || 0.9,
      summary: parsed.summary || "Prospect replied.",
      suggestedAction: parsed.suggestedAction || "send_info",
      detectedObjection: parsed.detectedObjection,
      quickDrafts: Array.isArray(parsed.quickDrafts) ? parsed.quickDrafts : [],
      modelUsed: "gpt-4o-mini",
    };
  } catch (err) {
    console.warn("[ai-reply-classifier] OpenAI classification fallback:", err);
    return null;
  }
}

/**
 * Main public entrypoint: Classifies an incoming LinkedIn reply and generates
 * 1-click tailored responses.
 */
export async function classifyLinkedInReply(
  options: ClassifyReplyOptions
): Promise<ReplyClassificationResult> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (openaiKey) {
    const aiResult = await classifyViaOpenAI(openaiKey, options);
    if (aiResult) return aiResult;
  }

  return classifyHeuristically(options);
}
