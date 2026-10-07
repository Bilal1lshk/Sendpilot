import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] dark:bg-[#141718] text-[#16191A] dark:text-[#F2F2F0] selection:bg-[#1F7A52] selection:text-white">
      {/* Calm Sticky Header with border only on scroll */}
      <Header />

      <main className="flex-1">
        {/* Calibrated Landing Hero & Live Product Preview */}
        <HeroSection />

        {/* Short 3-step How It Works with matching UI snippet */}
        <HowItWorks />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
