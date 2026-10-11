import { afterEach, describe, expect, it, vi } from "vitest";
import type { PendingAction } from "@prisma/client";
import { ActionError } from "./errors";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/integrations/tokens", () => ({
  getFreshTokens: async (_w: string, _u: string, provider: string) => ({
    accessToken: "tok",
    scopes: provider === "google" ? ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/calendar.events"] : [],
  }),
}));
vi.spyOn(console, "warn").mockImplementation(() => {});

const { executePendingAction, calendarEventIdFor } = await import("./execute");

const action = (kind: PendingAction["kind"], payload: Record<string, unknown>) => ({ id: "act_123", workspaceId: "w1", userId: "u1", kind, payload, status: "Approved" }) as unknown as PendingAction;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const meeting = action("CreateCalendarEvent", { title: "Sync", start: "2026-10-20T10:00:00Z", end: "2026-10-20T10:30:00Z" });
const email = action("SendEmail", { to: "pat@example.com", subject: "Hi", body: "Hello" });

afterEach(() => vi.unstubAllGlobals());

const failure = async (p: Promise<unknown>) => {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(ActionError);
  return err as ActionError;
};

describe("create meeting is safe to retry", () => {
  it("uses a fixed, valid event id for the action", async () => {
    const f = vi.fn(async () => json({ id: calendarEventIdFor("act_123"), htmlLink: "https://cal/e" }));
    vi.stubGlobal("fetch", f);
    const r = await executePendingAction(meeting);
    const sent = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.id).toBe(calendarEventIdFor("act_123"));
    expect(sent.id).toMatch(/^[0-9a-v]{5,1024}$/); // Google's allowed characters
    expect(r).toMatchObject({ link: "https://cal/e" });
  });

  it("on a conflict, counts it done only after Google confirms the event exists", async () => {
    const f = vi.fn().mockResolvedValueOnce(json({ error: { code: 409 } }, 409)).mockResolvedValueOnce(json({ id: "x", htmlLink: "https://cal/existing" }));
    vi.stubGlobal("fetch", f);
    const r = await executePendingAction(meeting);
    expect(String(f.mock.calls[1][0])).toContain(`/events/${calendarEventIdFor("act_123")}`);
    expect(r).toMatchObject({ alreadyExisted: true, link: "https://cal/existing" });
  });

  it("doesn't claim success when the conflicting event can't be found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({}, 409)).mockResolvedValueOnce(json({}, 404)));
    expect((await failure(executePendingAction(meeting))).certainty).toBe("not_done");
  });
});

describe("honest failures", () => {
  it("a dropped connection is 'unknown' - it may have been sent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const err = await failure(executePendingAction(email));
    expect(err.certainty).toBe("unknown");
    expect(err.message).toMatch(/Check Gmail before trying again/);
  });

  it("a provider server error is 'unknown' too", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 503)));
    expect((await failure(executePendingAction(email))).certainty).toBe("unknown");
  });

  it("a refusal is 'not done', with a plain reason and no raw provider text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":{"message":"Insufficient Permission: secret-internal-detail"}}', { status: 403 })));
    const err = await failure(executePendingAction(email));
    expect(err.certainty).toBe("not_done");
    expect(err.message).toMatch(/refused permission/);
    expect(err.message).not.toMatch(/secret-internal-detail/);
  });

  it("Slack's ok:false is a definite 'not posted'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: false, error: "channel_not_found" })));
    const err = await failure(executePendingAction(action("SendSlackMessage", { channelId: "C1", text: "hi" })));
    expect(err.certainty).toBe("not_done");
    expect(err.message).toMatch(/channel_not_found/);
  });

  it("a sent email still counts as sent if Gmail's reply can't be parsed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not json", { status: 200 })));
    await expect(executePendingAction(email)).resolves.toEqual({ gmailMessageId: null });
  });
});
