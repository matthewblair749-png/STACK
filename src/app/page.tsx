import { LandingNav } from "@/components/landing/nav";
import { StoryHero } from "@/components/landing/story/hero";
import { MorningChapter, UnderstandChapter, PrioritizeChapter, ActChapter, MoveForwardChapter } from "@/components/landing/story/chapters";
import { TrustChapter, AppsChapter, ClosingChapter } from "@/components/landing/story/closing";
import { MotionRoot } from "@/components/landing/story/motion-root";
import { hand } from "@/components/landing/story/fonts";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/landing/footer";
import { listProviders } from "@/server/integrations/registry";

const LEAD = ["google", "slack", "notion", "github", "linear", "asana", "jira", "hubspot", "stripe", "dropbox", "trello", "clickup", "zendesk"];

/**
 * The landing page tells one workday: the 8:47 AM pile-up, then STACK understanding, prioritizing, acting (with
 * approval) and moving forward - the same loop the product's Home page is built around.
 */
export default function LandingPage() {
  // Only apps that can really be connected on this deploy: either STACK's sign-in app is configured, or
  // the app accepts a key/token the person creates. Counted at build time from the real configuration,
  // so the page can't show an app that would fail to connect.
  const providers = listProviders().filter((p) => p.isConfigured() || !!p.tokenConnect);
  const rank = (id: string) => (LEAD.includes(id) ? LEAD.indexOf(id) : LEAD.length);
  const apps = [...providers]
    .sort((a, b) => rank(a.id) - rank(b.id) || a.label.localeCompare(b.label))
    .map((p) => ({ id: p.id, name: p.label }));

  return (
    <MotionRoot>
      <div className={`calm ${hand.variable} relative isolate flex min-h-screen flex-col overflow-x-clip`}>
        <LandingNav />
        <main className="flex-1">
          <StoryHero />
          <MorningChapter />
          <UnderstandChapter />
          <PrioritizeChapter />
          <ActChapter />
          <MoveForwardChapter />
          <TrustChapter />
          <AppsChapter featured={apps} total={providers.length} />
          <PricingSection />
          <ClosingChapter />
        </main>
        <Footer />
      </div>
    </MotionRoot>
  );
}
