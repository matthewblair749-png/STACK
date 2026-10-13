import { afterEach, describe, expect, it, vi } from "vitest";
import { airtableProvider } from "./airtable";
import { smartsheetProvider } from "./smartsheet";
import { typeformProvider } from "./typeform";
import { zoteroProvider } from "./zotero";
import { confluenceProvider } from "./confluence";
import { qualtricsProvider } from "./qualtrics";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

function stub(routes: [(u: string) => boolean, (u: string, init?: RequestInit) => Response][]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (u: string | URL, init?: RequestInit) => {
      const url = String(u);
      calls.push({ url, init });
      const hit = routes.find(([m]) => m(url));
      if (!hit) throw new Error(`unexpected fetch ${url}`);
      return hit[1](url, init);
    }),
  );
  return calls;
}

describe("Airtable", () => {
  it("validates with whoami and lists readable bases with links", async () => {
    stub([
      [(u) => u.endsWith("/meta/whoami"), () => json({ id: "usr1", email: "pat@x.com" })],
      [(u) => u.endsWith("/meta/bases"), () => json({ bases: [{ id: "appA", name: "CRM", permissionLevel: "edit" }, { id: "appB", name: "Hidden", permissionLevel: "none" }] })],
    ]);
    const v = await airtableProvider.tokenConnect!.validate("pat123", {});
    expect(v.account).toBe("pat@x.com");
    const files = await airtableProvider.getFiles!({ accessToken: "pat123", scopes: [], metadata: v.metadata });
    expect(files).toEqual([expect.objectContaining({ id: "appA", name: "CRM", url: "https://airtable.com/appA", modifiedAt: v.metadata!.connectedAt })]);
  });

  it("explains a token without the base scope", async () => {
    stub([
      [(u) => u.endsWith("/meta/whoami"), () => json({ id: "usr1" })],
      [(u) => u.endsWith("/meta/bases"), () => json({ error: "INVALID_PERMISSIONS" })],
    ]);
    await expect(airtableProvider.tokenConnect!.validate("pat123", {})).rejects.toThrow(/schema\.bases:read/);
  });
});

describe("Smartsheet", () => {
  it("lists sheets newest first with their permalinks", async () => {
    stub([[(u) => u.includes("/sheets"), () => json({ data: [{ id: 1, name: "Old", permalink: "https://app.smartsheet.com/sheets/a", modifiedAt: "2026-01-01T00:00:00Z" }, { id: 2, name: "New", permalink: "https://app.smartsheet.com/sheets/b", modifiedAt: "2026-10-01T00:00:00Z" }] })]]);
    const files = await smartsheetProvider.getFiles!({ accessToken: "t", scopes: [] });
    expect(files.map((f) => f.name)).toEqual(["New", "Old"]);
    expect(files[0]).toMatchObject({ id: "2", url: "https://app.smartsheet.com/sheets/b" });
  });
});

describe("Typeform", () => {
  it("asks for forms sorted by last update and maps the display link", async () => {
    const calls = stub([[(u) => u.includes("/forms"), () => json({ items: [{ id: "f1", title: "Signup", last_updated_at: "2026-10-01T00:00:00Z", _links: { display: "https://x.typeform.com/to/f1" } }] })]]);
    const files = await typeformProvider.getFiles!({ accessToken: "tfp_x", scopes: [] });
    expect(calls[0].url).toContain("sort_by=last_updated_at&order_by=desc");
    expect(files[0]).toMatchObject({ id: "f1", name: "Signup", url: "https://x.typeform.com/to/f1" });
  });
});

describe("Zotero", () => {
  it("reads the key's user id, refuses keys without library access, and lists recent items", async () => {
    stub([
      [(u) => u.includes("/keys/good"), () => json({ userID: 42, username: "pat", access: { user: { library: true } } })],
      [(u) => u.includes("/keys/nolib"), () => json({ userID: 42, username: "pat", access: { user: { library: false } } })],
      [(u) => u.includes("/users/42/items/top"), () => json([{ key: "ABCD", links: { alternate: { href: "https://www.zotero.org/pat/items/ABCD" } }, meta: { creatorSummary: "Smith" }, data: { title: "A paper", dateModified: "2026-10-01T00:00:00Z", itemType: "journalArticle" } }])],
    ]);
    const v = await zoteroProvider.tokenConnect!.validate("good", {});
    expect(v.metadata).toEqual({ userId: "42" });
    await expect(zoteroProvider.tokenConnect!.validate("nolib", {})).rejects.toThrow(/Allow library access/);
    const files = await zoteroProvider.getFiles!({ accessToken: "good", scopes: [], metadata: v.metadata });
    expect(files[0]).toMatchObject({ id: "ABCD", name: "A paper", url: "https://www.zotero.org/pat/items/ABCD", ownerName: "Smith" });
  });

  it("never builds a URL from a bad stored user id", async () => {
    stub([]);
    await expect(zoteroProvider.getFiles!({ accessToken: "k", scopes: [], metadata: { userId: "../evil" } })).rejects.toThrow(/Reconnect/);
  });
});

describe("Confluence", () => {
  it("only talks to *.atlassian.net and builds page links from the base", async () => {
    await expect(confluenceProvider.tokenConnect!.validate("tok", { site: "evil.example.com", email: "a@b.com" })).rejects.toThrow(/atlassian\.net/);
    stub([
      [(u) => u.includes("/wiki/rest/api/user/current"), () => json({ email: "a@b.com" })],
      [(u) => u.includes("/wiki/api/v2/pages"), () => json({ results: [{ id: 7, title: "Roadmap", version: { createdAt: "2026-10-01T00:00:00Z" }, _links: { webui: "/spaces/X/pages/7" } }], _links: { base: "https://acme.atlassian.net/wiki" } })],
    ]);
    const v = await confluenceProvider.tokenConnect!.validate("tok", { site: "acme", email: "a@b.com" });
    expect(v.metadata).toEqual({ site: "acme.atlassian.net", email: "a@b.com" });
    const files = await confluenceProvider.getFiles!({ accessToken: "tok", scopes: [], metadata: v.metadata });
    expect(files[0]).toMatchObject({ id: "7", name: "Roadmap", url: "https://acme.atlassian.net/wiki/spaces/X/pages/7" });
  });

  it("falls back to an unsorted read if the sort option is rejected", async () => {
    const calls = stub([
      [(u) => u.includes("sort=-modified-date"), () => json({ message: "bad sort" }, 400)],
      [(u) => u.includes("/wiki/api/v2/pages"), () => json({ results: [{ id: 1, title: "A", version: { createdAt: "2026-01-01T00:00:00Z" } }, { id: 2, title: "B", version: { createdAt: "2026-09-01T00:00:00Z" } }] })],
    ]);
    const files = await confluenceProvider.getFiles!({ accessToken: "tok", scopes: [], metadata: { site: "acme.atlassian.net", email: "a@b.com" } });
    expect(calls).toHaveLength(2);
    expect(files.map((f) => f.name)).toEqual(["B", "A"]);
  });
});

describe("Qualtrics", () => {
  it("uses the account's data center host and refuses anything else", async () => {
    await expect(qualtricsProvider.tokenConnect!.validate("tok", { datacenter: "evil.example.com" })).rejects.toThrow(/qualtrics\.com/);
    const calls = stub([
      [(u) => u.endsWith("/API/v3/whoami"), () => json({ result: { email: "pat@uni.edu" } })],
      [(u) => u.endsWith("/API/v3/surveys"), () => json({ result: { elements: [{ id: "SV_1", name: "Pilot", lastModified: "2026-10-01T00:00:00Z", isActive: true }] } })],
    ]);
    const v = await qualtricsProvider.tokenConnect!.validate("tok", { datacenter: "iad1" });
    expect(calls[0].url).toBe("https://iad1.qualtrics.com/API/v3/whoami");
    expect((calls[0].init?.headers as Record<string, string>)["X-API-TOKEN"]).toBe("tok");
    const files = await qualtricsProvider.getFiles!({ accessToken: "tok", scopes: [], metadata: v.metadata });
    expect(files[0]).toMatchObject({ id: "SV_1", name: "Pilot", url: "https://iad1.qualtrics.com/survey-builder/SV_1/edit" });
  });
});
