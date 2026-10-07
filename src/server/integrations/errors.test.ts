import { describe, expect, it } from "vitest";
import { friendlyProviderError } from "./errors";

describe("friendlyProviderError", () => {
  it("names the right app (a Slack 401 is not a Google error)", () => {
    const msg = friendlyProviderError("Slack", new Error("Slack messages failed: 401 invalid_auth"));
    expect(msg).toContain("Slack");
    expect(msg).not.toContain("Google");
    expect(msg).toMatch(/Reconnect Slack/);
  });

  it("never passes raw API text through", () => {
    const raw = 'GitHub notifications failed: 502 {"message":"Server Error","documentation_url":"https://docs.github.com"}';
    const msg = friendlyProviderError("GitHub", new Error(raw));
    expect(msg).not.toContain("documentation_url");
    expect(msg).not.toContain("{");
    expect(msg).toMatch(/isn't responding/);
  });

  it("treats a disabled Google API as STACK's problem, not the user's", () => {
    const msg = friendlyProviderError("Google", new Error('403 {"reason":"SERVICE_DISABLED","activationUrl":"https://console.developers.google.com/..."}'));
    expect(msg).toMatch(/on our side/);
    expect(msg).not.toMatch(/console\.developers|your Google Cloud/);
  });

  it("maps permission, rate-limit and unknown failures to an action", () => {
    expect(friendlyProviderError("Asana", new Error("403 Forbidden"))).toMatch(/permission/);
    expect(friendlyProviderError("Asana", new Error("429 Too Many Requests"))).toMatch(/limiting requests/);
    expect(friendlyProviderError("Asana", new Error("something odd"))).toMatch(/Sync now/);
  });

  it("uses connect wording during sign-in", () => {
    expect(friendlyProviderError("Linear", new Error("invalid_grant"), "connect")).toMatch(/Try connecting again/);
  });
});
