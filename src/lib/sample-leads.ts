/**
 * [SAMPLE DATA]
 * Realistic but clearly fictional sample leads and drafted messages for the live product preview.
 * Written like a person: no fake percentages, no emojis, no hype.
 */

export interface SampleLead {
  id: string;
  name: string;
  initials: string;
  role: string;
  company: string;
  fit: "Strong fit" | "Possible fit" | "Needs a look";
  fitReason: string;
  draftMessage: string;
  status: "Draft ready" | "Waiting for approval" | "Approved" | "Replied";
}

export const SAMPLE_LEADS: SampleLead[] = [
  {
    id: "lead_1",
    name: "Tariq Mansoor",
    initials: "TM",
    role: "Managing Partner",
    company: "Mansoor Real Estate Advisors",
    fit: "Strong fit",
    fitReason: "Runs a 12-person agency and posted about new listings last week.",
    draftMessage: "Hi Tariq, saw your team recently took on the Gulberg commercial project. How are you currently sourcing qualified buyers for those spaces?",
    status: "Waiting for approval",
  },
  {
    id: "lead_2",
    name: "Amina Farooq",
    initials: "AF",
    role: "Head of Acquisitions",
    company: "Beacon Commercial Properties",
    fit: "Strong fit",
    fitReason: "Actively hiring brokers and expanding into second-tier industrial parks.",
    draftMessage: "Hello Amina, noticed Beacon's expansion into industrial assets. We help commercial teams reach off-market property owners directly.",
    status: "Draft ready",
  },
  {
    id: "lead_3",
    name: "Bilal Rasheed",
    initials: "BR",
    role: "Director of Development",
    company: "Crescent Property Group",
    fit: "Possible fit",
    fitReason: "Senior development role, but has not updated their profile activity recently.",
    draftMessage: "Hi Bilal, wondered if Crescent is evaluating land acquisition pipelines in Punjab for Q4?",
    status: "Replied",
  },
];
