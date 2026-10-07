import { describe, expect, it } from "vitest";
import { effectivePlan, PAST_DUE_GRACE_DAYS } from "./billing";

const DAY = 86_400_000;
const now = new Date("2026-10-07T12:00:00Z");
const sub = (status: "Active" | "PastDue" | "Canceled" | "Incomplete", periodEndDaysAgo: number | null = null) => ({
  plan: "Team" as const,
  status,
  currentPeriodEnd: periodEndDaysAgo === null ? null : new Date(now.getTime() - periodEndDaysAgo * DAY),
  updatedAt: new Date(now.getTime() - DAY),
});

describe("effectivePlan", () => {
  it("no subscription is Free", () => expect(effectivePlan(null, now)).toBe("Free"));
  it("active keeps the bought plan", () => expect(effectivePlan(sub("Active", -20), now)).toBe("Team"));
  it("a failed payment keeps the plan during the grace period", () => {
    expect(effectivePlan(sub("PastDue", 1), now)).toBe("Team");
    expect(effectivePlan(sub("PastDue", PAST_DUE_GRACE_DAYS - 1), now)).toBe("Team");
  });
  it("a failed payment drops to Free after the grace period", () => {
    expect(effectivePlan(sub("PastDue", PAST_DUE_GRACE_DAYS + 1), now)).toBe("Free");
  });
  it("canceled and never-completed checkouts are Free", () => {
    expect(effectivePlan(sub("Canceled", -5), now)).toBe("Free");
    expect(effectivePlan(sub("Incomplete"), now)).toBe("Free");
  });
});
