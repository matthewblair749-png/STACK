import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const SECRET = "slack-signing-secret-test";
process.env.SLACK_SIGNING_SECRET = SECRET;

const deliveries = new Set<string>();
const integrations = [
  { id: "i1", workspaceId: "w1", userId: "u1", metadata: { teamId: "T1", slackUserId: "U1" } },
  { id: "i2", workspaceId: "w2", userId: "u2", metadata: { teamId: "T1", slackUserId: "U2" } },
];
const updateMany = vi.fn().mockResolvedValue({ count: 1 });
const jobDelete = vi.fn().mockResolvedValue({ count: 0 });
const enqueueSync = vi.fn().mockResolvedValue({ id: "j", created: true });
const afterCalls = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    webhookDelivery: {
      createMany: async ({ data }: { data: { deliveryId: string }[] }) => {
        if (deliveries.has(data[0].deliveryId)) return { count: 0 };
        deliveries.add(data[0].deliveryId);
        return { count: 1 };
      },
    },
    // Mirrors the JSON-path filter: connections in the given Slack team only.
    integration: {
      findMany: async ({ where }: { where: { metadata: { equals: string } } }) => integrations.filter((i) => i.metadata.teamId === where.metadata.equals),
      updateMany: (...a: unknown[]) => updateMany(...a),
    },
    syncJob: { deleteMany: (...a: unknown[]) => jobDelete(...a) },
  },
}));
vi.mock("@/server/sync/jobs", () => ({ enqueueSync: (...a: unknown[]) => enqueueSync(...a), processSyncJobs: vi.fn() }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: unknown) => afterCalls(fn) }));

const { POST } = await import("./route");
const { verifySlackSignature } = await import("@/server/integrations/slack-events");

function signed(body: unknown, opts: { secret?: string; ts?: number; tamper?: boolean } = {}) {
  const raw = JSON.stringify(body);
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const sig = `v0=${createHmac("sha256", opts.secret ?? SECRET).update(`v0:${ts}:${raw}`).digest("hex")}`;
  return new NextRequest("http://localhost/api/webhooks/slack", {
    method: "POST",
    body: opts.tamper ? raw.replace("T1", "T9") : raw,
    headers: { "x-slack-request-timestamp": ts, "x-slack-signature": sig, "content-type": "application/json" },
  });
}

const message = (eventId: string) => ({ type: "event_callback", team_id: "T1", event_id: eventId, event: { type: "message", channel: "C1", text: "hi" } });

beforeEach(() => {
  deliveries.clear();
  [updateMany, jobDelete, enqueueSync, afterCalls].forEach((m) => m.mockClear());
});

describe("Slack signature", () => {
  const raw = '{"a":1}';
  const sign = (ts: number, secret = SECRET) => `v0=${createHmac("sha256", secret).update(`v0:${ts}:${raw}`).digest("hex")}`;
  it("accepts a correct, fresh signature", () => expect(verifySlackSignature(raw, "1000", sign(1000), SECRET, 1000)).toBe(true));
  it("rejects a replay older than five minutes", () => expect(verifySlackSignature(raw, "1000", sign(1000), SECRET, 1000 + 301)).toBe(false));
  it("rejects the wrong secret", () => expect(verifySlackSignature(raw, "1000", sign(1000, "other"), SECRET, 1000)).toBe(false));
  it("rejects missing headers", () => expect(verifySlackSignature(raw, null, null, SECRET)).toBe(false));
});

describe("Slack events endpoint", () => {
  it("answers the URL verification challenge, but only when signed", async () => {
    const ok = await POST(signed({ type: "url_verification", challenge: "abc123" }));
    expect(await ok.json()).toEqual({ challenge: "abc123" });
    expect((await POST(signed({ type: "url_verification", challenge: "abc123" }, { secret: "forged" }))).status).toBe(401);
  });

  it("rejects a body changed after signing", async () => {
    expect((await POST(signed(message("Ev1"), { tamper: true }))).status).toBe(401);
    expect(enqueueSync).not.toHaveBeenCalled();
  });

  it("rejects stale requests (replay protection)", async () => {
    expect((await POST(signed(message("Ev1"), { ts: Math.floor(Date.now() / 1000) - 600 }))).status).toBe(401);
  });

  it("queues a debounced sync for every connection in that Slack team and syncs after responding", async () => {
    const res = await POST(signed(message("Ev1")));
    expect(res.status).toBe(200);
    expect(enqueueSync).toHaveBeenCalledTimes(2);
    expect(enqueueSync).toHaveBeenCalledWith("w1", "u1", "slack", "webhook", expect.any(Number));
    expect(afterCalls).toHaveBeenCalledOnce();
  });

  it("processes a retried delivery only once", async () => {
    await POST(signed(message("Ev1")));
    const retry = await POST(signed(message("Ev1")));
    expect(retry.status).toBe(200);
    expect(enqueueSync).toHaveBeenCalledTimes(2);
  });

  it("doesn't schedule another run when a sync is already waiting", async () => {
    enqueueSync.mockResolvedValue({ id: "j", created: false });
    await POST(signed(message("Ev2")));
    expect(afterCalls).not.toHaveBeenCalled();
    enqueueSync.mockResolvedValue({ id: "j", created: true });
  });

  it("marks only the revoked person's connection as needing reconnection", async () => {
    await POST(signed({ type: "event_callback", team_id: "T1", event_id: "Ev3", event: { type: "tokens_revoked", tokens: { oauth: ["U2"] } } }));
    expect(updateMany).toHaveBeenCalledWith({ where: { id: { in: ["i2"] } }, data: { syncError: expect.stringContaining("Reconnect Slack") } });
    expect(enqueueSync).not.toHaveBeenCalled();
  });

  it("marks every connection in the team when the app is uninstalled", async () => {
    await POST(signed({ type: "event_callback", team_id: "T1", event_id: "Ev4", event: { type: "app_uninstalled" } }));
    expect(updateMany).toHaveBeenCalledWith({ where: { id: { in: ["i1", "i2"] } }, data: expect.any(Object) });
  });

  it("ignores events for teams with no STACK connections", async () => {
    await POST(signed({ ...message("Ev5"), team_id: "T_OTHER" }));
    expect(enqueueSync).not.toHaveBeenCalled();
  });

  it("tells Slack not to retry when events aren't configured", async () => {
    delete process.env.SLACK_SIGNING_SECRET;
    try {
      const res = await POST(signed(message("Ev6")));
      expect(res.status).toBe(503);
      expect(res.headers.get("x-slack-no-retry")).toBe("1");
    } finally {
      process.env.SLACK_SIGNING_SECRET = SECRET;
    }
  });
});
