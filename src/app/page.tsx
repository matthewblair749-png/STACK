import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { StatsBar } from "@/components/landing/stats-bar";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { TrustSection } from "@/components/landing/trust-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { WorkspaceSection, ConnectsSection, SurfacesSection, AskAISection, AutomationSection } from "@/components/landing/narrative-sections";
import { IntegrationsTeaser } from "@/components/landing/integrations-teaser";
import { PricingSection } from "@/components/landing/pricing-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { listProviders } from "@/server/integrations/registry";

export default function LandingPage() {
  // Only apps that can really be connected on this deploy: either STACK's sign-in app is configured, or
  // the app accepts a key/token the person creates. Counted at build time from the real configuration,
  // so the number on the page can't claim an app that would fail to connect.
  const providers = listProviders().filter((p) => p.isConfigured() || !!p.tokenConnect);
  const featured = ["google", "slack", "notion", "github", "linear", "asana", "hubspot", "stripe", "dropbox", "trello", "clickup", "zendesk"]
    .map((id) => providers.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ id: p.id, name: p.label }));

  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <StatsBar appCount={providers.length} />
        <ProductShowcase />
        <TrustSection />
        <ProblemSection />
        <WorkspaceSection />
        <ConnectsSection />
        <SurfacesSection />
        <AskAISection />
        <AutomationSection />
        <IntegrationsTeaser featured={featured} total={providers.length} />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
