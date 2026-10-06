import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

/** How long paid features keep working after a failed renewal, while Stripe retries the card. */
export const PAST_DUE_GRACE_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

/**
 * The plan a workspace actually gets right now - the single source of truth for every limit. Stripe's
 * status decides it, not whatever plan was last bought: a canceled or never-completed checkout is Free,
 * and a failed payment keeps paid features only through a short grace period after the paid period ends.
 */
export function effectivePlan(
  sub: { plan: SubscriptionPlan; status: SubscriptionStatus; currentPeriodEnd: Date | null; updatedAt: Date } | null,
  now = new Date(),
): SubscriptionPlan {
  if (!sub) return "Free";
  switch (sub.status) {
    case "Active":
      return sub.plan;
    case "PastDue": {
      const since = sub.currentPeriodEnd ?? sub.updatedAt;
      return now.getTime() - since.getTime() < PAST_DUE_GRACE_DAYS * DAY ? sub.plan : "Free";
    }
    default:
      return "Free";
  }
}
