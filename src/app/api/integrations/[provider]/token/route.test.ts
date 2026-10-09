import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const upsert = vi.fn().mockResolvedValue({});
vi.mock("@/server/db", () => ({ db: { integration: { upsert: (...a: unknown[]) => upsert(...a) } } }));
vi.mock("@/server/workspace", () => ({
  UnauthorizedError: class extends Error {},
  ForbiddenError: class extends Error {},
  requireSessionAndWorkspace: async () => ({ session: { user: { id: "u1" } }, workspaceId: "w1", role: "Owner" }),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimit: async () => ({ ok: true, remaining: 9, retryAfterSec: 0 }), tooManyRequests: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

const { POST } = await import("./route");
const call = (token: string) =>
  POST(new NextRequest("http://localhost/api/integrations/slack/token", { method: "POST", body: JSON.stringify({ token }) }), { params: Promise.resolve({ provider: "slack" }) });

beforeEach(() => {
  upsert.mockClear();
  vi.unstubAllGlobals();
});

describe("paste-a-token connect", () => {
  it("doesn't save a token that is genuine but can't read anything", async () => {
    // auth.test passes, but every conversations.list type is missing_scope.
    vi.stubGlobal("fetch", vi.fn(async (u: string | URL) => (String(u).includes("auth.test") ? json({ ok: true, user: "pat", team: "Acme" }) : json({ ok: false, error: "missing_scope" }))));
    const res = await call("xoxp-0000000000000000000000");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/User Token Scopes/);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("saves a token that passes validation and the trial read", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string | URL) => {
      const s = String(u);
      if (s.includes("auth.test")) return json({ ok: true, user: "pat", team: "Acme", team_id: "T1" });
      if (s.includes("conversations.list")) return json({ ok: true, channels: [{ id: "C1", name: "general" }] });
      return json({ ok: true, messages: [] });
    }));
    const res = await call("xoxp-0000000000000000000000");
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledOnce();
  });

  it("rejects a bot token with instructions", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = await call("xoxb-0000000000000000000000");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/xoxp-/);
    expect(upsert).not.toHaveBeenCalled();
  });
});
