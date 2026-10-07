"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Does SendPilot scrape or risk my LinkedIn account?",
      a: "No. SendPilot uses official OpenID Connect authentication and assisted sending pacing. Every message is initiated within LinkedIn's safety boundaries with gradual warm-up curves, ensuring 100% account compliance.",
    },
    {
      q: "Can I connect my teammates' sender profiles?",
      a: "Yes. Pro and Scale plans allow you to invite teammates by email. A sender account is only activated when the team member explicitly signs in and grants permission.",
    },
    {
      q: "How does the AI lead qualification scoring work?",
      a: "You define your target ICP criteria (industry, geography, headcount, funding stage, and decision-maker roles). SendPilot's AI evaluates imported prospects and assigns a compatibility score from 0–100%.",
    },
    {
      q: "Can I review and edit messages before they are sent?",
      a: "Absolutely. SendPilot enforces human-in-the-loop approval on all first messages. You can edit any generated copy or approve batches with a single click.",
    },
    {
      q: "What CRM integrations are supported?",
      a: "SendPilot supports direct CSV export, Webhooks, and native synchronisation for HubSpot, Salesforce, and modern CRMs via API access on the Scale plan.",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-palm-leaf-200 dark:border-palm-leaf-800 bg-palm-leaf-50/70 dark:bg-palm-leaf-950/40 px-3.5 py-1 text-xs font-semibold text-palm-leaf-800 dark:text-palm-leaf-300">
            <HelpCircle className="h-3.5 w-3.5 text-palm-leaf-600" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-neutral-500 max-w-xl mx-auto">
            Everything you need to know about outbound deliverability, AI scoring, and team setups.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-neutral-900 dark:text-white cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-palm-leaf-600" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
