/**
 * SendPilot Human Microcopy System
 * Guidelines: Short sentences, plain words, no jargon. Helpful teammate tone.
 * Never invent urgency, fake numbers, or pressure language.
 */

export const microcopy = {
  greetings: {
    morning: (name: string) => `Good morning, ${name}. Here's where things stand.`,
    afternoon: (name: string) => `Good afternoon, ${name}. Here's where things stand.`,
    evening: (name: string) => `Good evening, ${name}. Here's where things stand.`,
    default: (name: string) => `Hello ${name}. Here's where things stand.`,
    getTimeAwareGreeting: (firstName: string) => {
      const hour = new Date().getHours();
      const name = firstName || "there";
      if (hour >= 5 && hour < 12) return `Good morning, ${name}. Here's where things stand.`;
      if (hour >= 12 && hour < 18) return `Good afternoon, ${name}. Here's where things stand.`;
      return `Good evening, ${name}. Here's where things stand.`;
    },
  },

  emptyStates: {
    leads: "No leads yet. Import a CSV and we'll score them for you.",
    campaigns: "No campaigns yet. Start with 20 leads and a friendly message.",
    accounts: "No accounts connected yet. Link your profile to begin.",
    tasksDone: "That's everything for today.",
    tasksDoneSubtitle: "Daily caps protect your profile reputation. Next batch prepares tomorrow.",
  },

  feedback: {
    leadsImportSuccess: (count: number) => `Done. ${count} leads added. Nice.`,
    fileError: "That file didn't look right. Check the columns and try again.",
    copiedMessage: "Copied to clipboard.",
    savedChanges: "Saved.",
    disconnectedNotice: (name: string) => `${name}'s connection dropped. Reconnect in one click.`,
    accountNeedsReconnect: (name: string) => `${name} needs to reconnect.`,
    aiDisclaimer: "Nothing is sent until you approve it.",
    approvalSuccess: "Approved and moved into campaign sequence.",
    abTestingNote: "Variant A is ahead, but it is too early to be sure.",
    creditEstimateClose: (used: number, remaining: number) =>
      `This uses about ${used} credits. You have ${remaining} left.`,
  },

  safety: {
    dailyCapLabel: (done: number, max: number) => `${done} of ${max} done`,
    warmupStage: (stage: number, max: number) => `Stage ${stage} of ${max}`,
    plainConsent: "We store basic profile data to verify sender identity. We never see your password or take actions without your explicit review.",
  },
} as const;
