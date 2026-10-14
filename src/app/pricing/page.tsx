import { LandingNav } from "@/components/landing/nav";
import { PricingSection } from "@/components/landing/pricing-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { hand } from "@/components/landing/story/fonts";

export default function PricingPage() {
  return (
    <div className={`calm ${hand.variable} relative isolate flex min-h-screen flex-col overflow-x-clip`}>
      <LandingNav />
      <main className="flex-1 pt-12">
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
