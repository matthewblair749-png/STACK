import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createOAuthState, oauthCookieName } from "@/server/integrations/oauth-state";

process.env.AUTH_SECRET = "test-secret-for-callback";
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.GOOGLE_CLIENT_ID = "client-id";
process.env.GOOGLE_CLIENT_SECRET = "client-secret";

const upsert = vi.fn().mockResolvedValue({});
let sessionUser = "u1";
vi.mock("@/server/db", () => ({ db: { integration: { upsert: (...a: unknown[]) => upsert(...a) } } }));
vi.mock("@/server/workspace", () => ({
  requireSessionAndWorkspace: async (workspaceId: string) => ({ session: { user: { id: sessionUser } }, workspaceId, role: "Owner" }),
}));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));

const { GET } = await import("./route");

function callback(query: Record<string, string>, cookie?: string) {
  const url = new URL("http://localhost/api/integrations/google/callback");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const req = new NextRequest(url, { headers: cookie ? { cookie: `${oauthCookieName("google")}=${cookie}` } : {} });
  return GET(req, { params: Promise.resolve({ provider: "google" }) });
}

const errorOf = (res: Response) => new URL(res.headers.get("location") ?? "http://x").searchParams.get("error") ?? "";
const started = () => createOAuthState({ provider: "google", workspaceId: "w1", userId: "u1", fields: {}, returnTo: "", pkce: true });

beforeEach(() => {
  upsert.mockClear();
  sessionUser = "u1";
  vi.unstubAllGlobals();
});

describe("OAuth callback", () => {
  it("exchanges the code with the PKCE verifier and saves encrypted tokens", async () => {
    const s = started();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "ya29.secret", refresh_token: "1//refresh", expires_in: 3600, scope: "a b" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await callback({ code: "auth-code", state: s.state }, s.cookieValue);

    expect(res.headers.get("location")).toContain("connected=google");
    const body = new URLSearchParams(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.get("code_verifier")).toBeTruthy();
    expect(upsert).toHaveBeenCalledOnce();
    const saved = JSON.stringify(upsert.mock.calls[0]);
    // Tokens are stored encrypted, never as plain text.
    expect(saved).not.toContain("ya29.secret");
    expect(saved).not.toContain("1//refresh");
  });

  it("rejects a forged state without contacting the provider", async () => {
    const s = started();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await callback({ code: "auth-code", state: "forged" }, s.cookieValue);
    expect(res.headers.get("location")).toContain("error=");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects a callback with no state cookie (login CSRF)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await callback({ code: "auth-code", state: "anything" });
    expect(res.headers.get("location")).toContain("error=");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("won't finish a sign-in into a different signed-in account", async () => {
    const s = started();
    sessionUser = "someone-else";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await callback({ code: "auth-code", state: s.state }, s.cookieValue);
    expect(errorOf(res)).toContain("different account");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("explains a cancelled consent and clears the state cookie", async () => {
    const s = started();
    const res = await callback({ error: "access_denied", state: s.state }, s.cookieValue);
    expect(errorOf(res)).toContain("cancelled");
    expect(res.headers.get("set-cookie") ?? "").toContain(`${oauthCookieName("google")}=;`);
  });

  it("doesn't save anything when the provider rejects the code", async () => {
    const s = started();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })));
    const res = await callback({ code: "used-code", state: s.state }, s.cookieValue);
    expect(res.headers.get("location")).toContain("error=");
    expect(upsert).not.toHaveBeenCalled();
  });
});
