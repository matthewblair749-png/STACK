import { afterEach, describe, expect, it, vi } from "vitest";
import { asanaProvider } from "./asana";
import { jiraProvider } from "./jira";
import { linearProvider } from "./linear";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("Asana tasks", () => {
  it("maps real fields: date-only and timed due dates, project, link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) =>
        String(u).includes("/users/me")
          ? json({ data: { workspaces: [{ gid: "w1" }] } })
          : json({
              data: [
                { gid: "1", name: "Write brief", completed: false, due_on: "2026-10-01", modified_at: "2026-10-05T10:00:00Z", permalink_url: "https://app.asana.com/0/1", projects: [{ name: "Launch" }] },
                { gid: "2", name: "Call", completed: false, due_at: "2026-10-12T15:00:00Z", due_on: "2026-10-12", modified_at: "2026-10-05T10:00:00Z" },
              ],
            }),
      ),
    );
    const { tasks, complete } = await asanaProvider.getTasks!({ accessToken: "t", scopes: [] });
    expect(complete).toBe(true);
    expect(tasks[0]).toMatchObject({ id: "1", title: "Write brief", due: "2026-10-01", container: "Launch", isDone: false, permalink: "https://app.asana.com/0/1" });
    // An exact time wins over the plain date.
    expect(tasks[1].due).toBe("2026-10-12T15:00:00Z");
  });

  it("reports an incomplete list when Asana has another page", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) => (String(u).includes("/users/me") ? json({ data: { workspaces: [{ gid: "w1" }] } }) : json({ data: [], next_page: { offset: "x" } }))));
    expect((await asanaProvider.getTasks!({ accessToken: "t", scopes: [] })).complete).toBe(false);
  });
});

describe("Jira issues", () => {
  it("maps status, due date, priority and project across granted sites", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) =>
        String(u).includes("accessible-resources")
          ? json([{ id: "site1", name: "Acme", url: "https://acme.atlassian.net" }])
          : json({
              isLast: true,
              issues: [{ key: "OPS-7", fields: { summary: "Fix login", status: { name: "In Progress", statusCategory: { key: "indeterminate" } }, duedate: "2026-10-03", priority: { name: "High" }, project: { name: "Ops" }, updated: "2026-10-05T10:00:00.000+0000" } }],
            }),
      ),
    );
    const { tasks, complete } = await jiraProvider.getTasks!({ accessToken: "t", scopes: [] });
    expect(complete).toBe(true);
    expect(tasks[0]).toMatchObject({ id: "site1:OPS-7", title: "OPS-7: Fix login", status: "In Progress", isDone: false, due: "2026-10-03", priority: "High", container: "Ops", permalink: "https://acme.atlassian.net/browse/OPS-7" });
  });

  it("uses the site directly for API-token connections and flags a partial list", async () => {
    const f = vi.fn(async () => json({ isLast: false, nextPageToken: "n", issues: [] }));
    vi.stubGlobal("fetch", f);
    const r = await jiraProvider.getTasks!({ accessToken: "t", scopes: [], metadata: { method: "token", site: "acme.atlassian.net", email: "a@b.com" } });
    expect(String((f.mock.calls[0] as unknown[])[0])).toContain("https://acme.atlassian.net/rest/api/3/search/jql");
    expect(r.complete).toBe(false);
  });
});

describe("Linear issues", () => {
  it("maps state, due date, priority label and team", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({
          data: {
            viewer: {
              assignedIssues: {
                nodes: [{ id: "i1", identifier: "ENG-3", title: "Ship it", url: "https://linear.app/x/ENG-3", updatedAt: "2026-10-05T10:00:00Z", dueDate: "2026-10-20", priorityLabel: "Urgent", state: { name: "Todo", type: "unstarted" }, team: { name: "Eng" } }],
                pageInfo: { hasNextPage: false },
              },
            },
          },
        }),
      ),
    );
    const { tasks, complete } = await linearProvider.getTasks!({ accessToken: "lin_api_x", scopes: [] });
    expect(complete).toBe(true);
    expect(tasks[0]).toMatchObject({ id: "i1", title: "ENG-3: Ship it", status: "Todo", isDone: false, due: "2026-10-20", priority: "Urgent", container: "Eng" });
  });

  it("drops the 'No priority' placeholder", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: { viewer: { assignedIssues: { nodes: [{ id: "i", identifier: "A-1", title: "t", updatedAt: "2026-10-05T10:00:00Z", priorityLabel: "No priority", state: { name: "Todo" } }], pageInfo: { hasNextPage: true } } } } })));
    const r = await linearProvider.getTasks!({ accessToken: "lin_api_x", scopes: [] });
    expect(r.tasks[0].priority).toBeUndefined();
    expect(r.complete).toBe(false);
  });
});

describe("Trello cards", () => {
  it("maps due date and completion, and keeps the card link", async () => {
    const { trelloProvider } = await import("./trello");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json([{ id: "c1", name: "Draft deck", due: "2026-10-09T17:00:00.000Z", dueComplete: false, dateLastActivity: "2026-10-05T10:00:00Z", url: "https://trello.com/c/1" }])),
    );
    const { tasks, complete } = await trelloProvider.getTasks!({ accessToken: "t", scopes: [], metadata: { apiKey: "k" } });
    expect(complete).toBe(true);
    expect(tasks[0]).toMatchObject({ id: "c1", title: "Draft deck", due: "2026-10-09T17:00:00.000Z", isDone: false, permalink: "https://trello.com/c/1" });
  });
});

describe("ClickUp tasks", () => {
  it("maps millisecond due dates, status and priority", async () => {
    const { clickupProvider } = await import("./clickup");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) => {
        const s = String(u);
        if (s.endsWith("/user")) return json({ user: { id: 7 } });
        if (s.endsWith("/team")) return json({ teams: [{ id: "t1" }] });
        return json({ tasks: [{ id: "x1", name: "QA", status: { status: "in progress", type: "custom" }, due_date: "1760000000000", priority: { priority: "high" }, list: { name: "Sprint" }, url: "https://app.clickup.com/t/x1", date_updated: "1759900000000" }] });
      }),
    );
    const { tasks, complete } = await clickupProvider.getTasks!({ accessToken: "pk_x", scopes: [] });
    expect(complete).toBe(true);
    expect(tasks[0]).toMatchObject({ id: "x1", status: "in progress", isDone: false, due: new Date(1760000000000).toISOString(), priority: "high", container: "Sprint" });
  });
});

describe("GitHub tasks", () => {
  it("combines assigned issues/PRs and direct review requests with distinct ids", async () => {
    const { githubProvider } = await import("./github");
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) => {
        calls.push(String(u));
        if (String(u).includes("/search/issues")) return json({ total_count: 1, incomplete_results: false, items: [{ id: 9, number: 4, title: "Add cache", html_url: "https://github.com/o/r/pull/4", repository_url: "https://api.github.com/repos/o/r", updated_at: "2026-10-05T10:00:00Z", pull_request: {} }] });
        return json([{ id: 9, number: 4, title: "Add cache", html_url: "https://github.com/o/r/pull/4", repository: { full_name: "o/r" }, updated_at: "2026-10-05T10:00:00Z", pull_request: {} }]);
      }),
    );
    const { tasks, complete } = await githubProvider.getTasks!({ accessToken: "t", scopes: [] });
    expect(calls.some((c) => decodeURIComponent(c).includes("user-review-requested:@me"))).toBe(true);
    expect(complete).toBe(true);
    // The same PR assigned to you and awaiting your review is two different to-dos.
    expect(tasks.map((t) => [t.id, t.status, t.title])).toEqual([
      ["assigned:9", "Pull request assigned", "o/r#4: Add cache"],
      ["review:9", "Review requested", "o/r#4: Add cache"],
    ]);
  });
});

describe("GitLab tasks", () => {
  it("maps assigned issues with due dates and merge requests to review", async () => {
    const { gitlabProvider } = await import("./gitlab");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) =>
        String(u).includes("/issues")
          ? json([{ id: 1, iid: 6, title: "Fix CI", due_date: "2026-10-15", references: { full: "grp/proj#6" }, web_url: "https://gitlab.com/grp/proj/-/issues/6", updated_at: "2026-10-05T10:00:00Z" }])
          : json([{ id: 2, iid: 3, title: "Refactor", references: { full: "grp/proj!3" }, web_url: "https://gitlab.com/grp/proj/-/merge_requests/3", updated_at: "2026-10-05T10:00:00Z" }]),
      ),
    );
    const { tasks, complete } = await gitlabProvider.getTasks!({ accessToken: "t", scopes: [] });
    expect(complete).toBe(true);
    expect(tasks[0]).toMatchObject({ id: "issue:1", title: "grp/proj#6: Fix CI", due: "2026-10-15", container: "grp/proj" });
    expect(tasks[1]).toMatchObject({ id: "mr:2", status: "Review requested", container: "grp/proj" });
  });
});

describe("Monday.com assigned items", () => {
  it("filters each board's people columns by assigned_to_me and maps date and status columns", async () => {
    const { mondayProvider } = await import("./monday");
    const bodies: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        const q = JSON.parse(String(init.body)).query as string;
        bodies.push(q);
        if (q.includes("columns(types: [people])"))
          return json({ data: { boards: [{ id: "11", name: "Launch", columns: [{ id: "person" }, { id: "owner" }] }, { id: "12", name: "No people", columns: [] }] } });
        return json({
          data: {
            b0: [{ items_page: { cursor: null, items: [{ id: "501", name: "Write copy", updated_at: "2026-10-05T10:00:00Z", url: "https://x.monday.com/boards/11/pulses/501", column_values: [{ type: "status", text: "Working on it" }, { type: "date", text: "2026-10-14", date: "2026-10-14" }] }] } }],
          },
        });
      }),
    );
    const { tasks, complete } = await mondayProvider.getTasks!({ accessToken: "t", scopes: [] });
    // Only boards with a people column are queried, with one rule per people column.
    expect(bodies[1]).toContain('b0: boards(ids: ["11"])');
    expect(bodies[1]).not.toContain('"12"');
    expect(bodies[1]).toContain('column_id: "person", compare_value: ["assigned_to_me"], operator: any_of');
    expect(bodies[1]).toContain('column_id: "owner"');
    expect(complete).toBe(true);
    expect(tasks).toEqual([expect.objectContaining({ id: "501", title: "Write copy", status: "Working on it", isDone: false, due: "2026-10-14", container: "Launch" })]);
  });

  it("flags a partial list when a board has more items than one page", async () => {
    const { mondayProvider } = await import("./monday");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) =>
        String(init.body).includes("columns(types: [people])")
          ? json({ data: { boards: [{ id: "11", name: "Big", columns: [{ id: "person" }] }] } })
          : json({ data: { b0: [{ items_page: { cursor: "more", items: [] } }] } }),
      ),
    );
    expect((await mondayProvider.getTasks!({ accessToken: "t", scopes: [] })).complete).toBe(false);
  });
});
