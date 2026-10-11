import { afterEach, describe, expect, it, vi } from "vitest";
import { microsoftSyncIncremental, MS_LIMITS, syncOneDrive, syncOutlookCalendar, syncOutlookMail } from "./microsoft-sync";

const tokens = { accessToken: "eyJ.test", scopes: [] };
const G = "https://graph.microsoft.com/v1.0";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const msg = (id: string, extra: object = {}) => ({ id, subject: `S ${id}`, from: { emailAddress: { name: "Pat", address: "pat@contoso.com" } }, bodyPreview: "hi", receivedDateTime: "2026-10-10T10:00:00Z", isRead: false, webLink: `https://outlook/${id}`, ...extra });

function stub(routes: [(u: string) => boolean, (u: string) => Response][]) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (u: string | URL) => {
      const url = String(u);
      calls.push(url);
      const hit = routes.find(([m]) => m(url));
      if (!hit) throw new Error(`unexpected fetch ${url}`);
      return hit[1](url);
    }),
  );
  return calls;
}
afterEach(() => vi.unstubAllGlobals());

describe("Outlook mail (messages/delta)", () => {
  it("starts on the Inbox limited to recent mail, and saves the deltaLink when the round finishes", async () => {
    const calls = stub([
      [(u) => u.includes("skiptoken=p2"), () => json({ value: [msg("b")], "@odata.deltaLink": `${G}/me/mailFolders/inbox/messages/delta?$deltatoken=d1` })],
      [(u) => u.includes("/me/mailFolders/inbox/messages/delta"), () => json({ value: [msg("a")], "@odata.nextLink": `${G}/me/mailFolders/inbox/messages/delta?$skiptoken=p2` })],
    ]);
    const { delta, cursor } = await syncOutlookMail(tokens, undefined, new Date("2026-10-11T00:00:00Z"));
    expect(new URL(calls[0]).searchParams.get("$filter")).toBe("receivedDateTime ge 2026-07-13T00:00:00.000Z");
    expect(delta.upserts.map((m) => m.id)).toEqual(["a", "b"]);
    expect(delta.upserts[0]).toMatchObject({ fromAddress: "pat@contoso.com", isUnread: true });
    expect(cursor).toBe(`${G}/me/mailFolders/inbox/messages/delta?$deltatoken=d1`);
  });

  it("applies removals and re-reads partial updates instead of blanking them", async () => {
    stub([
      [(u) => u.includes("deltatoken=d1"), () => json({ value: [{ id: "gone", "@removed": { reason: "deleted" } }, { id: "read", isRead: true }], "@odata.deltaLink": `${G}/x?$deltatoken=d2` })],
      [(u) => u.includes("/me/messages/read"), () => json(msg("read", { isRead: true }))],
    ]);
    const { delta, cursor } = await syncOutlookMail(tokens, `${G}/me/mailFolders/inbox/messages/delta?$deltatoken=d1`);
    expect(delta.deletedIds).toEqual(["gone"]);
    expect(delta.upserts).toEqual([expect.objectContaining({ id: "read", subject: "S read", isUnread: false })]);
    expect(cursor).toContain("d2");
  });

  it("restarts the round when Graph says the sync state expired (410)", async () => {
    const calls = stub([
      [(u) => u.includes("deltatoken=old"), () => json({ error: { code: "syncStateNotFound" } }, 410)],
      [(u) => u.includes("/me/mailFolders/inbox/messages/delta"), () => json({ value: [msg("a")], "@odata.deltaLink": `${G}/x?$deltatoken=new` })],
    ]);
    const { cursor } = await syncOutlookMail(tokens, `${G}/me/mailFolders/inbox/messages/delta?$deltatoken=old`);
    expect(calls).toHaveLength(2);
    expect(cursor).toContain("new");
  });

  it("saves a nextLink to continue a long first round next run", async () => {
    let n = 0;
    stub([[(u) => u.includes("delta"), () => json({ value: [], "@odata.nextLink": `${G}/me/mailFolders/inbox/messages/delta?$skiptoken=s${++n}` })]]);
    const { cursor } = await syncOutlookMail(tokens, undefined);
    expect(cursor).toContain(`s${MS_LIMITS.mailPages}`);
  });

  it("never follows a stored cursor that isn't a Graph URL (no token leaks)", async () => {
    const calls = stub([[(u) => u.startsWith(`${G}/me/mailFolders/inbox/messages/delta`), () => json({ value: [], "@odata.deltaLink": `${G}/x?$deltatoken=d` })]]);
    await syncOutlookMail(tokens, "https://evil.example/steal");
    expect(calls.every((c) => c.startsWith(G))).toBe(true);
  });
});

describe("OneDrive (driveItem delta)", () => {
  it("first run: takes token=latest before a bounded read of files (folders skipped)", async () => {
    const calls = stub([
      [(u) => u.includes("token=latest"), () => json({ value: [], "@odata.deltaLink": `${G}/me/drive/root/delta?token=t1` })],
      [(u) => u.includes("/root/children"), () => json({ value: [{ id: "f1", name: "Plan.docx", file: { mimeType: "application/msword" }, webUrl: "https://od/f1", lastModifiedDateTime: "2026-10-01T00:00:00Z" }, { id: "d1", name: "Folder", folder: {} }] })],
    ]);
    const { delta, cursor } = await syncOneDrive(tokens, undefined);
    expect(calls[0]).toContain("token=latest");
    expect(delta).toMatchObject({ full: true, upserts: [{ id: "f1", name: "Plan.docx" }] });
    expect(cursor).toBe(`${G}/me/drive/root/delta?token=t1`);
  });

  it("applies changes: the deleted facet removes, the last occurrence wins, folders are ignored", async () => {
    stub([
      [
        (u) => u.includes("token=t1"),
        () =>
          json({
            value: [
              { id: "a", name: "A v1", file: {}, lastModifiedDateTime: "2026-10-01T00:00:00Z" },
              { id: "a", name: "A v2", file: {}, lastModifiedDateTime: "2026-10-02T00:00:00Z" },
              { id: "b", name: "B", deleted: {} },
              { id: "c", name: "C", folder: {} },
            ],
            "@odata.deltaLink": `${G}/me/drive/root/delta?token=t2`,
          }),
      ],
    ]);
    const { delta, cursor } = await syncOneDrive(tokens, `${G}/me/drive/root/delta?token=t1`);
    expect(delta.upserts).toEqual([expect.objectContaining({ id: "a", name: "A v2" })]);
    expect(delta.deletedIds).toEqual(["b"]);
    expect(cursor).toContain("t2");
  });

  it("starts over when the token is gone (410)", async () => {
    stub([
      [(u) => u.includes("token=old"), () => json({ error: { code: "resyncRequired" } }, 410)],
      [(u) => u.includes("token=latest"), () => json({ value: [], "@odata.deltaLink": `${G}/me/drive/root/delta?token=fresh` })],
      [(u) => u.includes("/root/children"), () => json({ value: [] })],
    ]);
    const { delta, cursor } = await syncOneDrive(tokens, `${G}/me/drive/root/delta?token=old`);
    expect(delta.full).toBe(true);
    expect(cursor).toContain("fresh");
  });
});

describe("Outlook calendar", () => {
  it("reads the window in UTC, adds the Z, and skips cancelled events", async () => {
    let prefer = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        prefer = (init.headers as Record<string, string>).Prefer;
        return json({ value: [{ id: "e1", subject: "Standup", start: { dateTime: "2026-10-12T09:00:00.0000000" }, end: { dateTime: "2026-10-12T09:15:00.0000000" } }, { id: "e2", isCancelled: true, start: {}, end: {} }] });
      }),
    );
    const delta = await syncOutlookCalendar(tokens);
    expect(prefer).toBe('outlook.timezone="UTC"');
    expect(delta).toMatchObject({ full: true, upserts: [{ id: "e1", start: "2026-10-12T09:00:00.0000000Z" }] });
  });
});

describe("microsoftSyncIncremental", () => {
  it("keeps syncing mail and calendar when OneDrive fails, without moving OneDrive's cursor", async () => {
    stub([
      [(u) => u.includes("/messages/delta"), () => json({ value: [], "@odata.deltaLink": `${G}/x?$deltatoken=m` })],
      [(u) => u.includes("/drive/"), () => json({ error: { code: "itemNotFound" } }, 404)],
      [(u) => u.includes("/calendarView"), () => json({ value: [] })],
    ]);
    const r = await microsoftSyncIncremental(tokens, {});
    expect(Object.keys(r.cursors)).toEqual(["outlook-mail"]);
    expect(r.files).toBeUndefined();
    expect(r.errors).toHaveLength(1);
  });
});
