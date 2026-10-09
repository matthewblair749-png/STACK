import { afterEach, describe, expect, it, vi } from "vitest";
import { greenhouseProvider } from "./providers/greenhouse";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const basic = (id: string, secret: string) => `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
const CLIENT_ID = "s5D99Sk7QniWKDwqyhDTH4rLDn6Lv3V9YKVe-4";
const SECRET = "gh_client_secret_example_value";

/** A fake Greenhouse: auth.greenhouse.io hands out a token for the right client, Harvest v3 answers the list endpoints. */
function fakeGreenhouse(data: { applications?: unknown[]; candidates?: unknown[]; jobs?: unknown[] } = {}) {
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.href === "https://auth.greenhouse.io/token") {
      const headers = init?.headers as Record<string, string>;
      if (headers.Authorization !== basic(CLIENT_ID, SECRET)) return json({ error: "invalid_client" }, 401);
      return json({ token_type: "Bearer", access_token: "jwt-access", expires_in: 3600 });
    }
    if ((init?.headers as Record<string, string>)?.Authorization !== "Bearer jwt-access") return json({ error: "unauthorized" }, 401);
    if (url.pathname === "/v3/applications") return json(data.applications ?? []);
    if (url.pathname === "/v3/candidates") return json(data.candidates ?? []);
    if (url.pathname === "/v3/jobs") return json(data.jobs ?? []);
    return json({ error: "not found" }, 404);
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("connect Greenhouse with Harvest v3 client credentials", () => {
  it("mints a token with the client ID and secret, then makes one read", async () => {
    const fetchMock = fakeGreenhouse();
    vi.stubGlobal("fetch", fetchMock);
    const result = await greenhouseProvider.tokenConnect!.validate(SECRET, { clientId: ` ${CLIENT_ID} ` });
    expect(result).toEqual({ account: "Greenhouse", metadata: { clientId: CLIENT_ID } });

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://auth.greenhouse.io/token");
    expect(tokenInit!.method).toBe("POST");
    expect((tokenInit!.headers as Record<string, string>)["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(tokenInit!.body).toBe("grant_type=client_credentials");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const read = new URL(String(fetchMock.mock.calls[1][0]));
    expect(read.origin + read.pathname).toBe("https://harvest.greenhouse.io/v3/applications");
    expect(read.searchParams.get("per_page")).toBe("1");
  });

  it("rejects a secret Greenhouse refuses", async () => {
    vi.stubGlobal("fetch", fakeGreenhouse());
    await expect(greenhouseProvider.tokenConnect!.validate("wrong_secret_value_123456", { clientId: CLIENT_ID })).rejects.toThrow(/401/);
  });

  it("rejects a malformed client ID before calling Greenhouse", async () => {
    const fetchMock = fakeGreenhouse();
    vi.stubGlobal("fetch", fetchMock);
    await expect(greenhouseProvider.tokenConnect!.validate(SECRET, { clientId: "not a client id" })).rejects.toThrow(/Client ID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says in the steps that only an admin can create the credentials", () => {
    expect(greenhouseProvider.tokenConnect!.steps[0]).toMatch(/Site Admin/);
    expect(greenhouseProvider.tokenConnect!.steps.join(" ")).toMatch(/Harvest V3 \(OAuth\)/);
  });
});

describe("sync mapping: Greenhouse applications to messages", () => {
  it("mints a fresh token from the stored secret and maps applications with candidate and job names", async () => {
    const fetchMock = fakeGreenhouse({
      applications: [
        { id: 11, candidate_id: 1, job_id: 100, stage_name: "Phone Screen", needs_decision: false, prospect: false, last_activity_at: "2026-10-05T09:00:00.000Z" },
        { id: 12, candidate_id: 2, job_id: 100, stage_name: "Onsite", needs_decision: true, prospect: false, last_activity_at: "2026-10-07T15:30:00.000Z" },
        { id: 13, candidate_id: 3, job_id: null, stage_name: null, needs_decision: null, prospect: true, last_activity_at: null, updated_at: "2026-10-01T00:00:00.000Z" },
      ],
      candidates: [
        { id: 1, first_name: "Pete", last_name: "Jones", preferred_name: null },
        { id: 2, first_name: "Alexandra", last_name: "Kim", preferred_name: "Alex" },
        { id: 3, first_name: "Sam", last_name: null, preferred_name: null },
      ],
      jobs: [{ id: 100, name: "Senior Engineer" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const messages = await greenhouseProvider.getMessages!({ accessToken: SECRET, scopes: [], metadata: { clientId: CLIENT_ID, method: "token" } });

    expect(messages.map((m) => m.id)).toEqual(["12", "11", "13"]);
    expect(messages[0]).toEqual({
      id: "12",
      subject: "Alex Kim",
      from: "Senior Engineer",
      snippet: "Onsite - needs a decision",
      receivedAt: "2026-10-07T15:30:00.000Z",
      isUnread: true,
      permalink: "https://app.greenhouse.io/people/2?application_id=12",
    });
    expect(messages[1]).toMatchObject({ subject: "Pete Jones", snippet: "Phone Screen", isUnread: false });
    expect(messages[2]).toMatchObject({ subject: "Sam", from: "Prospect", snippet: "Active", receivedAt: "2026-10-01T00:00:00.000Z" });

    const urls = fetchMock.mock.calls.map(([u]) => new URL(String(u)));
    expect(urls[0].href).toBe("https://auth.greenhouse.io/token");
    const apps = urls.find((u) => u.pathname === "/v3/applications")!;
    expect(apps.searchParams.get("status")).toBe("active");
    expect(Date.parse(apps.searchParams.get("last_activity_at[gte]")!)).toBeLessThan(Date.now());
    expect(urls.find((u) => u.pathname === "/v3/candidates")!.searchParams.get("ids")).toBe("1,2,3");
    expect(urls.find((u) => u.pathname === "/v3/jobs")!.searchParams.get("ids")).toBe("100");
  });

  it("skips the name lookups when nothing is active", async () => {
    const fetchMock = fakeGreenhouse({ applications: [] });
    vi.stubGlobal("fetch", fetchMock);
    expect(await greenhouseProvider.getMessages!({ accessToken: SECRET, scopes: [], metadata: { clientId: CLIENT_ID } })).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("asks to reconnect when the client ID is missing", async () => {
    vi.stubGlobal("fetch", fakeGreenhouse());
    await expect(greenhouseProvider.getMessages!({ accessToken: SECRET, scopes: [] })).rejects.toThrow(/401.*Reconnect Greenhouse/);
  });
});
