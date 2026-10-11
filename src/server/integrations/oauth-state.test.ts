import { createHash } from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createOAuthState, createPkcePair, OAUTH_STATE_MAX_AGE_SEC, safeReturnPath, verifyOAuthState } from "./oauth-state";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-oauth-state";
});

const base = { provider: "google", workspaceId: "w1", userId: "u1", fields: {}, returnTo: "" };

describe("OAuth state", () => {
  it("accepts the state it issued and returns the payload", () => {
    const s = createOAuthState({ ...base, pkce: true });
    const check = verifyOAuthState(s.cookieValue, s.state, "google");
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.payload.userId).toBe("u1");
      expect(check.payload.workspaceId).toBe("w1");
      expect(check.payload.codeVerifier).toBeTruthy();
    }
  });

  it("rejects a callback whose state doesn't match (CSRF)", () => {
    const s = createOAuthState({ ...base, pkce: false });
    expect(verifyOAuthState(s.cookieValue, "attacker-state", "google")).toEqual({ ok: false, reason: "mismatch" });
  });

  it("rejects a missing cookie or missing state", () => {
    const s = createOAuthState({ ...base, pkce: false });
    expect(verifyOAuthState(undefined, s.state, "google")).toEqual({ ok: false, reason: "missing" });
    expect(verifyOAuthState(s.cookieValue, null, "google")).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects a cookie that was edited (e.g. to point at another workspace or user)", () => {
    const s = createOAuthState({ ...base, pkce: false });
    const [body, sig] = s.cookieValue.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    const forged = Buffer.from(JSON.stringify({ ...payload, userId: "victim" })).toString("base64url");
    expect(verifyOAuthState(`${forged}.${sig}`, s.state, "google")).toEqual({ ok: false, reason: "tampered" });
    expect(verifyOAuthState("not-a-cookie", s.state, "google")).toEqual({ ok: false, reason: "tampered" });
  });

  it("rejects a state issued for a different provider (mix-up)", () => {
    const s = createOAuthState({ ...base, pkce: false });
    expect(verifyOAuthState(s.cookieValue, s.state, "microsoft")).toEqual({ ok: false, reason: "wrong_provider" });
  });

  it("rejects an expired state", () => {
    const s = createOAuthState({ ...base, pkce: false });
    const later = Date.now() + (OAUTH_STATE_MAX_AGE_SEC + 1) * 1000;
    expect(verifyOAuthState(s.cookieValue, s.state, "google", later)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a cookie signed with a different secret", () => {
    const s = createOAuthState({ ...base, pkce: false });
    process.env.AUTH_SECRET = "rotated";
    try {
      expect(verifyOAuthState(s.cookieValue, s.state, "google")).toEqual({ ok: false, reason: "tampered" });
    } finally {
      process.env.AUTH_SECRET = "test-secret-for-oauth-state";
    }
  });
});

describe("PKCE", () => {
  it("makes an S256 challenge from a high-entropy verifier", () => {
    const { codeVerifier, codeChallenge } = createPkcePair();
    expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(codeChallenge).toBe(createHash("sha256").update(codeVerifier).digest("base64url"));
  });

  it("only issues a verifier when the provider uses PKCE", () => {
    expect(createOAuthState({ ...base, pkce: false }).codeChallenge).toBeUndefined();
    expect(createOAuthState({ ...base, pkce: true }).codeChallenge).toBeTruthy();
  });
});

describe("return paths", () => {
  it("allows same-site paths only", () => {
    expect(safeReturnPath("/onboarding")).toBe("/onboarding");
    expect(safeReturnPath("//evil.example")).toBe("");
    expect(safeReturnPath("https://evil.example")).toBe("");
    expect(safeReturnPath("/a?b=c")).toBe("");
  });
});
