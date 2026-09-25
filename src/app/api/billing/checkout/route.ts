import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { getStripe, isStripeConfigured, priceIdFor, priceEnvVarName, type CheckoutPlan, type BillingInterval } from "@/server/stripe";

const PLANS: CheckoutPlan[] = ["Solo", "Team", "Business"];
const INTERVALS: BillingInterval[] = ["monthly", "yearly"];

export async function POST(req: NextRequest) {
  try {
    const { session, workspaceId, role } = await requireSessionAndWorkspace();
    if (role !== "Owner" && role !== "Admin") {
      return NextResponse.json({ error: "Only workspace owners and admins can change billing." }, { status: 403 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Billing isn't configured — set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY." },
        { status: 400 }
      );
    }

    const { plan, interval } = (await req.json()) as { plan?: string; interval?: string };
    if (!plan || !PLANS.includes(plan as CheckoutPlan)) {
      return NextResponse.json({ error: `Plan must be one of: ${PLANS.join(", ")}.` }, { status: 400 });
    }
    const billingInterval = (interval as BillingInterval) || "monthly";
    if (!INTERVALS.includes(billingInterval)) {
      return NextResponse.json({ error: `Interval must be one of: ${INTERVALS.join(", ")}.` }, { status: 400 });
    }

    const priceId = priceIdFor(plan as CheckoutPlan, billingInterval);
    if (!priceId) {
      return NextResponse.json(
        { error: `Set ${priceEnvVarName(plan as CheckoutPlan, billingInterval)} to enable ${billingInterval} checkout for the ${plan} plan.` },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const subscription = await db.subscription.findUnique({ where: { workspaceId } });

    let customerId = subscription?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        metadata: { workspaceId },
      });
      customerId = customer.id;
      await db.subscription.upsert({
        where: { workspaceId },
        create: { workspaceId, stripeCustomerId: customerId },
        update: { stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.APP_URL || req.nextUrl.origin;
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?checkout=success`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
      metadata: { workspaceId, plan, interval: billingInterval },
      subscription_data: { metadata: { workspaceId, plan, interval: billingInterval } },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    return handleApiError(err, "POST /api/billing/checkout failed");
  }
}
