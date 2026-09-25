export type PlanId = "free" | "solo" | "team" | "business" | "enterprise";

export interface PlanLimits {
  openTabs: number;
}

// Central place to change plan limits without touching feature code.
// Enterprise is "custom" in the brief — represented here as a larger
// default that an admin config would normally override per workspace.
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { openTabs: 3 },
  solo: { openTabs: 10 },
  team: { openTabs: 10 },
  business: { openTabs: 10 },
  enterprise: { openTabs: 25 },
};

export const planLabel: Record<PlanId, string> = {
  free: "Free",
  solo: "Solo",
  team: "Team",
  business: "Business",
  enterprise: "Enterprise",
};

export function getOpenTabsLimit(plan: PlanId): number {
  return PLAN_LIMITS[plan].openTabs;
}
