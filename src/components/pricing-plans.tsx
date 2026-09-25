export interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Try STACK with the basics.",
    features: ["Basic workspace", "Limited integrations", "Basic tasks", "Limited AI"],
    cta: "Get started",
  },
  {
    name: "Solo",
    price: "$5",
    period: "/month",
    description: "For individuals who want it all connected.",
    features: [
      "Unlimited integrations",
      "AI assistant",
      "Tasks & projects",
      "Calendar",
      "File search",
      "Automations",
    ],
    cta: "Start free trial",
  },
  {
    name: "Team",
    price: "$12",
    period: "/user/month",
    description: "For teams working together.",
    features: [
      "Everything in Solo",
      "Shared workspace",
      "Team projects",
      "Team AI",
      "Shared knowledge",
      "Workflow automation",
      "Admin controls",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$20",
    period: "/user/month",
    description: "For growing companies that need more control.",
    features: [
      "Advanced AI",
      "Company-wide search",
      "Advanced automation",
      "Analytics",
      "Advanced permissions",
      "Priority support",
    ],
    cta: "Start free trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For organizations with advanced needs.",
    features: ["SSO", "Advanced security", "Custom integrations", "Dedicated support", "Custom contracts"],
    cta: "Contact sales",
  },
];
