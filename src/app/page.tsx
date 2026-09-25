import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { StatsBar } from "@/components/landing/stats-bar";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { Testimonials } from "@/components/landing/testimonials";
import { ProblemSection } from "@/components/landing/problem-section";
import { WorkspaceSection, ConnectsSection, SurfacesSection, AskAISection, AutomationSection } from "@/components/landing/narrative-sections";
import { IntegrationsTeaser } from "@/components/landing/integrations-teaser";
import { PricingSection } from "@/components/landing/pricing-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <StatsBar />
        <ProductShowcase />
        <Testimonials />
        <ProblemSection />
        <WorkspaceSection />
        <ConnectsSection />
        <SurfacesSection />
        <AskAISection />
        <AutomationSection />
        <IntegrationsTeaser />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
