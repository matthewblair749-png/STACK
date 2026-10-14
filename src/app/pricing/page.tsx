import { LandingNav } from "@/components/landing/nav";
import { PricingSection } from "@/components/landing/pricing-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Starfield } from "@/components/landing/story/space";

export default function PricingPage() {
  return (
    <div className="cosmic relative isolate flex min-h-screen flex-col overflow-x-clip">
      <Starfield />
      <LandingNav />
      <main className="flex-1 pt-12">
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
