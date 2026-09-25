import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/server/db";
import { getStripe } from "@/server/stripe";

const STATUS_MAP: Record<string, "Active" | "PastDue" | "Canceled" | "Incomplete"> = {
  active: "Active",
  trialing: "Active",
  past_due: "PastDue",
  canceled: "Canceled",
  unpaid: "PastDue",
  incomplete: "Incomplete",
  incomplete_expired: "Canceled",
};

const PRICE_TO_PLAN: Record<string, "Solo" | "Team" | "Business"> = {};
for (const [envVar, plan] of [
  ["STRIPE_PRICE_SOLO", "Solo"],
  ["STRIPE_PRICE_SOLO_YEARLY", "Solo"],
  ["STRIPE_PRICE_TEAM", "Team"],
  ["STRIPE_PRICE_TEAM_YEARLY", "Team"],
  ["STRIPE_PRICE_BUSINESS", "Business"],
  ["STRIPE_PRICE_BUSINESS_YEARLY", "Business"],
] as const) {
  const priceId = process.env[envVar];
  if (priceId) PRICE_TO_PLAN[priceId] = plan;
}

async function upsertFromSubscription(sub: Stripe.Subscription, workspaceId?: string) {
  const priceId = sub.items.data[0]?.price?.id;
  const plan = (priceId && PRICE_TO_PLAN[priceId]) || undefined;
  const wsId = workspaceId ?? sub.metadata?.workspaceId;
  if (!wsId) {
    console.error("Stripe webhook: subscription has no workspaceId metadata", sub.id);
    return;
  }

  await db.subscription.upsert({
    where: { workspaceId: wsId },
    create: {
      workspaceId: wsId,
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripeSubscriptionId: sub.id,
      plan: plan ?? "Free",
      status: STATUS_MAP[sub.status] ?? "Incomplete",
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
    update: {
      stripeSubscriptionId: sub.id,
      ...(plan ? { plan } : {}),
      status: STATUS_MAP[sub.status] ?? "Incomplete",
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe webhooks aren't configured." }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature ?? "", secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        if (checkoutSession.subscription) {
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(checkoutSession.subscription as string);
          await upsertFromSubscription(sub, checkoutSession.metadata?.workspaceId);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        if (workspaceId) {
          await db.subscription.update({
            where: { workspaceId },
            data: { plan: "Free", status: "Canceled" },
          }).catch(() => {});
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handling failed", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
