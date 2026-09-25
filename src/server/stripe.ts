import Stripe from "stripe";

let client: Stripe | null = null;

export function isStripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Billing isn't configured — set STRIPE_SECRET_KEY in your environment.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
  }
  return client;
}

export type CheckoutPlan = "Solo" | "Team" | "Business";
export type BillingInterval = "monthly" | "yearly";

const PRICE_ENV_VAR: Record<CheckoutPlan, Record<BillingInterval, string>> = {
  Solo: { monthly: "STRIPE_PRICE_SOLO", yearly: "STRIPE_PRICE_SOLO_YEARLY" },
  Team: { monthly: "STRIPE_PRICE_TEAM", yearly: "STRIPE_PRICE_TEAM_YEARLY" },
  Business: { monthly: "STRIPE_PRICE_BUSINESS", yearly: "STRIPE_PRICE_BUSINESS_YEARLY" },
};

export function priceEnvVarName(plan: CheckoutPlan, interval: BillingInterval): string {
  return PRICE_ENV_VAR[plan][interval];
}

export function priceIdFor(plan: CheckoutPlan, interval: BillingInterval = "monthly"): string | undefined {
  return process.env[priceEnvVarName(plan, interval)];
}
