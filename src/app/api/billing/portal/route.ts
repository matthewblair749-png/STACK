import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { getStripe, isStripeConfigured } from "@/server/stripe";

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, role } = await requireSessionAndWorkspace();
    if (role !== "Owner" && role !== "Admin") {
      return NextResponse.json({ error: "Only workspace owners and admins can manage billing." }, { status: 403 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Billing isn't configured — set STRIPE_SECRET_KEY." }, { status: 400 });
    }

    const subscription = await db.subscription.findUnique({ where: { workspaceId } });
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account yet — subscribe to a plan first." }, { status: 400 });
    }

    const stripe = getStripe();
    const appUrl = process.env.APP_URL || req.nextUrl.origin;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    return handleApiError(err, "POST /api/billing/portal failed");
  }
}
