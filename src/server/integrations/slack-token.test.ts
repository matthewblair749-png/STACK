import { afterEach, describe, expect, it, vi } from "vitest";
import { slackProvider } from "./providers/slack";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

/** A fake Slack that grants only the conversation types in `allowed` (Slack answers missing_scope for the rest). */
function fakeSlack(allowed: string[]) {
  return vi.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/auth.test")) return json({ ok: true, user: "pat", team: "Acme", team_id: "T1" });
    if (url.pathname.endsWith("/conversations.list")) {
      const types = (url.searchParams.get("types") ?? "").split(",");
      if (types.some((t) => !allowed.includes(t))) return json({ ok: false, error: "missing_scope" });
      return json({ ok: true, channels: allowed.includes("public_channel") ? [{ id: "C1", name: "general" }] : [{ id: "D1", is_im: true }] });
    }
    if (url.pathname.endsWith("/conversations.history")) return json({ ok: true, messages: [{ ts: "1791500000.000100", text: "Standup moved to 10", user: "U2" }] });
    return json({ ok: false, error: "unknown_method" });
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("connect Slack with a pasted token", () => {
  it("rejects a bot token before calling Slack", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(slackProvider.tokenConnect!.validate("xoxb-123", {})).rejects.toThrow(/User OAuth Token \(xoxp-\)/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a token that can't read any conversations, naming the scopes to add", async () => {
    vi.stubGlobal("fetch", fakeSlack([]));
    await expect(slackProvider.tokenConnect!.validate("xoxp-1", {})).rejects.toThrow(/channels:read/);
  });

  it("accepts a token with some scopes and records what it can read", async () => {
    vi.stubGlobal("fetch", fakeSlack(["public_channel", "im"]));
    const result = await slackProvider.tokenConnect!.validate("xoxp-1", {});
    expect(result.account).toBe("pat - Acme");
    expect(result.metadata).toMatchObject({ conversationTypes: ["public_channel", "im"], missingScopes: ["groups:read", "mpim:read"] });
  });
});

describe("Slack sync with partial scopes", () => {
  it("still syncs what it can when an older connection lacks some scopes", async () => {
    vi.stubGlobal("fetch", fakeSlack(["public_channel"]));
    const messages = await slackProvider.getMessages!({ accessToken: "xoxp-1", scopes: [] });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ subject: "#general", snippet: "Standup moved to 10" });
  });

  it("fails clearly when the token can read nothing", async () => {
    vi.stubGlobal("fetch", fakeSlack([]));
    await expect(slackProvider.getMessages!({ accessToken: "xoxp-1", scopes: [] })).rejects.toThrow(/missing_scope/);
  });
});

describe("Slack connected with a bot token", () => {
  it("refuses to sync and explains how to fix it", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(slackProvider.getMessages!({ accessToken: "xoxb-1", scopes: [] })).rejects.toThrow(/bot_token_not_supported/);
    expect(fetchMock).not.toHaveBeenCalled();
    const { friendlyProviderError } = await import("./errors");
    expect(friendlyProviderError("Slack", new Error("Slack bot_token_not_supported"))).toMatch(/User OAuth Token \(starts with xoxp-\)/);
  });
});
