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
