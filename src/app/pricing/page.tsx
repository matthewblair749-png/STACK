import { LandingNav } from "@/components/landing/nav";
import { PricingSection } from "@/components/landing/pricing-section";
import { ClosingChapter } from "@/components/landing/story/closing";
import { Footer } from "@/components/landing/footer";

export default function PricingPage() {
  return (
    <div className="calm relative isolate flex min-h-screen flex-col overflow-x-clip">
      <LandingNav />
      <main className="flex-1 pt-12">
        <PricingSection />
        <ClosingChapter />
      </main>
      <Footer />
    </div>
  );
}
