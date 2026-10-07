import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { NextRequest } from "next/server";

// Placeholder values for the test only - never real credentials.
const WEBHOOK_SECRET = "whsec_unit_test";
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_unit");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
vi.stubEnv("STRIPE_PRICE_TEAM", "price_team_monthly");

const upsert = vi.fn();
const update = vi.fn().mockResolvedValue({});
vi.mock("@/server/db", () => ({ db: { subscription: { upsert: (...a: unknown[]) => upsert(...a), update: (...a: unknown[]) => update(...a) } } }));

const { POST } = await import("./route");

function signed(event: object, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new NextRequest("http://localhost/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": header } });
}

const subscriptionEvent = (type: string, status: string) => ({
  id: "evt_1",
  object: "event",
  type,
  data: {
    object: {
      id: "sub_1",
      object: "subscription",
      customer: "cus_1",
      status,
      current_period_end: 1_790_000_000,
      metadata: { workspaceId: "ws-a" },
      items: { data: [{ price: { id: "price_team_monthly" } }] },
    },
  },
});

beforeEach(() => {
  upsert.mockReset().mockResolvedValue({});
  update.mockClear();
});

describe("Stripe webhook", () => {
  it("rejects a request with a bad signature and writes nothing", async () => {
    const res = await POST(signed(subscriptionEvent("customer.subscription.updated", "active"), "whsec_wrong"));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("records an active subscription with its plan", async () => {
    const res = await POST(signed(subscriptionEvent("customer.subscription.updated", "active")));
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert.mock.calls[0][0]).toMatchObject({ where: { workspaceId: "ws-a" }, update: { plan: "Team", status: "Active" } });
  });

  it("records a failed payment as PastDue (the grace period then applies)", async () => {
    await POST(signed(subscriptionEvent("customer.subscription.updated", "past_due")));
    expect(upsert.mock.calls[0][0].update.status).toBe("PastDue");
  });

  it("downgrades to Free when the subscription is deleted", async () => {
    await POST(signed(subscriptionEvent("customer.subscription.deleted", "canceled")));
    expect(update).toHaveBeenCalledWith({ where: { workspaceId: "ws-a" }, data: { plan: "Free", status: "Canceled" } });
  });

  it("asks Stripe to retry when saving fails", async () => {
    upsert.mockRejectedValueOnce(new Error("database down"));
    const res = await POST(signed(subscriptionEvent("customer.subscription.updated", "active")));
    expect(res.status).toBe(500);
  });
});
