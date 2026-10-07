import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { AiAssistantSection } from "@/components/landing/AiAssistantSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { LeadProfileShowcase } from "@/components/landing/LeadProfileShowcase";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 selection:bg-indigo-500 selection:text-white">
      {/* Sticky Glass Navbar */}
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* Social Proof */}
        <SocialProofSection />

        {/* Problem Section */}
        <ProblemSection />

        {/* Solution Section (1 Workspace Workflow) */}
        <SolutionSection />

        {/* Features Bento Grid */}
        <FeaturesSection />

        {/* AI Sales Copilot Showcase */}
        <AiAssistantSection />

        {/* How It Works 4-Step Timeline */}
        <HowItWorksSection />

        {/* Detailed Lead Profile Showcase */}
        <LeadProfileShowcase />

        {/* Pricing Preview */}
        <PricingSection />

        {/* Frequently Asked Questions */}
        <FaqSection />
      </main>

      {/* Modern SaaS Footer */}
      <Footer />
    </div>
  );
}
