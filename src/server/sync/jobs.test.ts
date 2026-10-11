import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("./orchestrator", () => ({ afterSync: vi.fn(), recordSyncResult: vi.fn(), syncOneProvider: vi.fn() }));
vi.mock("@/server/work/state", () => ({ invalidateWorkState: vi.fn() }));

const { backoffMs, JOB_POLICY, nextJobState } = await import("./jobs");

describe("sync job retries", () => {
  it("backs off exponentially with jitter, capped at the maximum", () => {
    const top = () => 1; // jitter at its ceiling
    expect(backoffMs(1, top)).toBe(JOB_POLICY.baseDelayMs);
    expect(backoffMs(2, top)).toBe(JOB_POLICY.baseDelayMs * 2);
    expect(backoffMs(3, top)).toBe(JOB_POLICY.baseDelayMs * 4);
    expect(backoffMs(30, top)).toBe(JOB_POLICY.maxDelayMs);
    // Never less than half the ceiling, so retries can't stampede.
    expect(backoffMs(3, () => 0)).toBe(JOB_POLICY.baseDelayMs * 2);
  });

  it("finishes a successful run", () => {
    expect(nextJobState({}, 1, 0)).toMatchObject({ status: "Succeeded", lastError: null });
  });

  it("retries a transient failure later", () => {
    const next = nextJobState({ error: "Google is having problems" }, 1, 1_000, () => 1);
    expect(next.status).toBe("Queued");
    expect(next.runAfter!.getTime()).toBe(1_000 + JOB_POLICY.baseDelayMs);
  });

  it("never retries revoked access - the person has to reconnect", () => {
    expect(nextJobState({ error: "Reconnect Google", permanent: true }, 1, 0).status).toBe("Failed");
  });

  it("gives up after the maximum attempts", () => {
    expect(nextJobState({ error: "still down" }, JOB_POLICY.maxAttempts, 0).status).toBe("Failed");
    expect(nextJobState({ error: "still down" }, JOB_POLICY.maxAttempts - 1, 0).status).toBe("Queued");
  });
});
