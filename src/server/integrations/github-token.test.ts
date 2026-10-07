import { afterEach, describe, expect, it, vi } from "vitest";
import { githubProvider } from "./providers/github";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("connect GitHub with a pasted token", () => {
  it("accepts a working token and reports whose account it is", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ login: "octocat" }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await githubProvider.tokenConnect!.validate("github_pat_example", {});
    expect(result.account).toBe("octocat");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.github.com/user");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer github_pat_example");
  });

  it("rejects a token GitHub refuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ message: "Bad credentials" }, 401)));
    await expect(githubProvider.tokenConnect!.validate("ghp_wrong", {})).rejects.toThrow(/401/);
  });
});

describe("sync mapping: GitHub notifications to messages", () => {
  it("maps each notification to a message with a web link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json([
          {
            id: 42,
            unread: true,
            reason: "review_requested",
            updated_at: "2026-10-07T10:00:00Z",
            repository: { full_name: "acme/web" },
            subject: { title: "Fix login redirect", type: "PullRequest", url: "https://api.github.com/repos/acme/web/pulls/7" },
          },
        ]),
      ),
    );
    const [m] = await githubProvider.getMessages!({ accessToken: "t", scopes: [] });
    expect(m).toMatchObject({ id: "42", subject: "Fix login redirect", from: "acme/web", isUnread: true, receivedAt: "2026-10-07T10:00:00Z" });
    expect(m.snippet).toContain("review requested");
    expect(m.permalink).toMatch(/^https:\/\/github\.com\/acme\/web\/pull\/7/);
  });
});
