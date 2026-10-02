export interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  /** Not available yet - shown honestly, with no sign-up or checkout attached. */
  comingSoon?: boolean;
}

/**
 * Only what can really be used today is offered. Paid tiers return when they unlock something real -
 * listing features that don't exist (or selling a checkout that can't complete) isn't a plan.
 */
export const pricingPlans: PricingPlan[] = [
  {
    name: "Early access",
    price: "$0",
    period: "while in early access",
    description: "Everything STACK does today, free.",
    features: [
      "Connect any supported app",
      "Home, Inbox, My Work, Calendar and Files",
      "STACK AI with sources for every answer",
      "Video calls in the browser",
      "Projects and tasks",
      "Approve every action before it happens",
    ],
    cta: "Get started",
    highlighted: true,
  },
  {
    name: "Teams",
    price: "Coming soon",
    description: "STACK for a whole team, on the roadmap.",
    features: ["Invite teammates to your workspace", "Shared projects and tasks", "Calls with your whole team"],
    cta: "Not available yet",
    comingSoon: true,
  },
];
