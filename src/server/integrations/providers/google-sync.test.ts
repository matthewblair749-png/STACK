import { afterEach, describe, expect, it, vi } from "vitest";
import { googleSyncIncremental, LIMITS, syncCalendar, syncDrive, syncGmail } from "./google-sync";

const tokens = { accessToken: "ya29.test", scopes: [] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const meta = (id: string, labels: string[] = ["INBOX"], historyId = "900") => ({
  id,
  threadId: `t-${id}`,
  historyId,
  labelIds: labels,
  snippet: `snippet ${id}`,
  internalDate: "1760000000000",
  payload: { headers: [{ name: "Subject", value: `Subject ${id}` }, { name: "From", value: "Pat <pat@example.com>" }] },
});

/** Routes fetches by URL substring; anything unexpected fails the test loudly. */
function stubFetch(routes: [string, (url: URL) => Response][]) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (u: string | URL) => {
      const url = new URL(String(u));
      calls.push(url.toString());
      const hit = routes.find(([part]) => url.toString().includes(part));
      if (!hit) throw new Error(`unexpected fetch ${url}`);
      return hit[1](url);
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("Gmail", () => {
  it("does a bounded full read first and stores the newest message's historyId", async () => {
    stubFetch([
      ["/messages?", () => json({ messages: [{ id: "m2" }, { id: "m1" }] })],
      ["/messages/m2", () => json(meta("m2", ["INBOX", "UNREAD"], "905"))],
      ["/messages/m1", () => json(meta("m1", ["INBOX"], "800"))],
    ]);
    const { delta, cursor } = await syncGmail(tokens, undefined);
    expect(delta.full).toBe(true);
    expect(delta.upserts.map((m) => m.id)).toEqual(["m2", "m1"]);
    expect(delta.upserts[0]).toMatchObject({ subject: "Subject m2", fromAddress: "pat@example.com", isUnread: true });
    expect(cursor).toBe("905");
  });

  it("applies history: new mail added, archived mail and deleted mail removed", async () => {
    stubFetch([
      ["/history", () => json({ history: [{ messagesAdded: [{ message: { id: "new" } }] }, { labelsRemoved: [{ message: { id: "archived" } }] }, { messagesDeleted: [{ message: { id: "gone" } }] }], historyId: "950" })],
      ["/messages/new", () => json(meta("new"))],
      ["/messages/archived", () => json(meta("archived", ["CATEGORY_UPDATES"]))],
    ]);
    const { delta, cursor } = await syncGmail(tokens, "900");
    expect(delta.full).toBe(false);
    expect(delta.upserts.map((m) => m.id)).toEqual(["new"]);
    expect(delta.deletedIds.sort()).toEqual(["archived", "gone"]);
    expect(cursor).toBe("950");
  });

  it("falls back to a full read when the historyId has expired (404)", async () => {
    stubFetch([
      ["/history", () => json({ error: { code: 404 } }, 404)],
      ["/messages?", () => json({ messages: [{ id: "m1" }] })],
      ["/messages/m1", () => json(meta("m1", ["INBOX"], "1000"))],
    ]);
    const { delta, cursor } = await syncGmail(tokens, "1");
    expect(delta.full).toBe(true);
    expect(cursor).toBe("1000");
  });

  it("re-reads the inbox instead of fetching an unbounded backlog of changes", async () => {
    const many = Array.from({ length: LIMITS.historyMessages + 1 }, (_, i) => ({ messagesAdded: [{ message: { id: `x${i}` } }] }));
    stubFetch([
      ["/history", () => json({ history: many, historyId: "2000" })],
      ["/messages?", () => json({ messages: [] })],
      ["/profile", () => json({ historyId: "2001" })],
    ]);
    const { delta, cursor } = await syncGmail(tokens, "1");
    expect(delta.full).toBe(true);
    expect(cursor).toBe("2001");
  });

  it("treats a message that vanished between history and fetch as deleted", async () => {
    stubFetch([
      ["/history", () => json({ history: [{ messagesAdded: [{ message: { id: "brief" } }] }], historyId: "960" })],
      ["/messages/brief", () => json({ error: {} }, 404)],
    ]);
    const { delta } = await syncGmail(tokens, "900");
    expect(delta.upserts).toEqual([]);
    expect(delta.deletedIds).toEqual(["brief"]);
  });
});

describe("Drive", () => {
  it("takes the start token before the first read", async () => {
    const calls = stubFetch([
      ["/changes/startPageToken", () => json({ startPageToken: "tok-1" })],
      ["/files?", () => json({ files: [{ id: "f1", name: "Plan", webViewLink: "https://drive/f1", modifiedTime: "2026-10-01T00:00:00Z" }] })],
    ]);
    const { delta, cursor } = await syncDrive(tokens, undefined);
    expect(calls[0]).toContain("startPageToken");
    expect(delta).toMatchObject({ full: true, upserts: [{ id: "f1", name: "Plan" }] });
    expect(cursor).toBe("tok-1");
  });

  it("applies changes in order: edits upserted, trashed and removed files deleted", async () => {
    stubFetch([
      [
        "/changes?",
        () =>
          json({
            changes: [
              { fileId: "a", file: { id: "a", name: "A v1", modifiedTime: "2026-10-01T00:00:00Z" } },
              { fileId: "a", file: { id: "a", name: "A v2", modifiedTime: "2026-10-02T00:00:00Z" } },
              { fileId: "b", file: { id: "b", name: "B", trashed: true } },
              { fileId: "c", removed: true },
            ],
            newStartPageToken: "tok-2",
          }),
      ],
    ]);
    const { delta, cursor } = await syncDrive(tokens, "tok-1");
    expect(delta.upserts).toEqual([expect.objectContaining({ id: "a", name: "A v2" })]);
    expect(delta.deletedIds.sort()).toEqual(["b", "c"]);
    expect(cursor).toBe("tok-2");
  });

  it("saves progress mid-way when there are more pages than one run reads", async () => {
    let n = 0;
    stubFetch([["/changes?", () => json({ changes: [], nextPageToken: `p${++n}` })]]);
    const { cursor, delta } = await syncDrive(tokens, "tok-1");
    expect(cursor).toBe(`p${LIMITS.drivePages}`);
    expect(delta.full).toBe(false);
  });
});

describe("Calendar", () => {
  it("re-reads a fixed window and drops cancelled events", async () => {
    stubFetch([
      [
        "/calendars/primary/events",
        () =>
          json({
            items: [
              { id: "e1", summary: "Standup", start: { dateTime: "2026-10-12T09:00:00Z" }, end: { dateTime: "2026-10-12T09:15:00Z" }, attendees: [{ email: "a@x.com" }] },
              { id: "e2", status: "cancelled" },
            ],
          }),
      ],
    ]);
    const delta = await syncCalendar(tokens, new Date("2026-10-11T00:00:00Z"));
    expect(delta.full).toBe(true);
    expect(delta.upserts).toEqual([expect.objectContaining({ id: "e1", title: "Standup", attendees: ["a@x.com"] })]);
  });

  it("never removes anything when the window didn't fit in the page budget", async () => {
    stubFetch([["/calendars/primary/events", () => json({ items: [], nextPageToken: "more" })]]);
    expect((await syncCalendar(tokens)).full).toBe(false);
  });
});

describe("googleSyncIncremental", () => {
  it("keeps syncing the other apps when one fails, and doesn't move that one's cursor", async () => {
    stubFetch([
      ["/history", () => json({ history: [], historyId: "901" })],
      ["/changes?", () => json({ error: { message: "Drive API has not been used in project" } }, 403)],
      ["/calendars/primary/events", () => json({ items: [] })],
    ]);
    const r = await googleSyncIncremental(tokens, { gmail: "900", drive: "tok-1" });
    expect(r.cursors).toEqual({ gmail: "901" });
    expect(r.messages).toBeDefined();
    expect(r.files).toBeUndefined();
    expect(r.errors).toHaveLength(1);
  });
});
