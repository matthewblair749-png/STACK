import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "./safe-callback";
import { isProtectedPath } from "./protected-paths";

describe("sign-in redirect (safeCallbackUrl)", () => {
  it("keeps same-site paths, including invite links", () => {
    expect(safeCallbackUrl("/home")).toBe("/home");
    expect(safeCallbackUrl("/invite/abc123")).toBe("/invite/abc123");
    expect(safeCallbackUrl("/tasks?view=mine")).toBe("/tasks?view=mine");
  });

  it("never redirects to another site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "evil.example"]) {
      expect(safeCallbackUrl(bad)).toBe("/home");
    }
  });

  it("falls back when missing", () => {
    expect(safeCallbackUrl(undefined)).toBe("/home");
    expect(safeCallbackUrl("")).toBe("/home");
    expect(safeCallbackUrl(null, "/onboarding")).toBe("/onboarding");
  });
});

describe("route protection (isProtectedPath)", () => {
  it("protects every signed-in area and its sub-pages", () => {
    for (const p of ["/home", "/tasks", "/projects/123", "/settings", "/billing", "/team", "/calls", "/call/abc", "/invite/tok", "/onboarding", "/ai"]) {
      expect(isProtectedPath(p), p).toBe(true);
    }
  });

  it("leaves public pages open", () => {
    for (const p of ["/", "/login", "/signup", "/pricing", "/privacy", "/terms", "/forgot-password"]) {
      expect(isProtectedPath(p), p).toBe(false);
    }
  });

  it("doesn't match look-alike prefixes or public logo files", () => {
    expect(isProtectedPath("/homepage")).toBe(false);
    expect(isProtectedPath("/integrations/slack.svg")).toBe(false);
    expect(isProtectedPath("/integrations")).toBe(true);
  });
});
