import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { isStripeConfigured } from "@/server/stripe";
import { effectivePlan, PAST_DUE_GRACE_DAYS } from "@/server/billing";

export async function GET() {
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const [subscription, seats] = await Promise.all([
      db.subscription.findUnique({ where: { workspaceId } }),
      db.workspaceMember.count({ where: { workspaceId } }),
    ]);

    return NextResponse.json({
      configured: isStripeConfigured(),
      // What the workspace actually gets now (limits follow this), and what was bought.
      plan: effectivePlan(subscription),
      billedPlan: subscription?.plan ?? "Free",
      graceDays: PAST_DUE_GRACE_DAYS,
      status: subscription?.status ?? "Active",
      currentPeriodEnd: subscription?.currentPeriodEnd,
      hasStripeCustomer: !!subscription?.stripeCustomerId,
      seats,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/billing/status failed");
  }
}
