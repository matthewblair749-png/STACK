/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { ProviderTask, TaskList } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://api.clickup.com/api/v2";
// ClickUp personal tokens go in the header as-is (no "Bearer").
const h = (token: string) => ({ Authorization: token });

/** Open ClickUp tasks assigned to you, newest activity first, become messages. */
export const clickupProvider = tokenOnlyProvider({
  id: "clickup",
  label: "ClickUp",
  capabilities: ["issues", "search"],
  tokenConnect: {
    label: "ClickUp personal API token",
    placeholder: "pk_...",
    helpUrl: "https://app.clickup.com/settings/apps",
    steps: [
      "Open the link below. Under API Token, click Generate (or Regenerate).",
      "Copy the token (it starts with pk_).",
      "Paste it here. STACK reads the tasks assigned to you.",
    ],
    async validate(token) {
      const data = await getJson("ClickUp token check", `${API}/user`, { headers: h(token) });
      return { account: data.user?.email ?? data.user?.username };
    },
  },
  async getTasks(tokens): Promise<TaskList> {
    const headers = h(tokens.accessToken);
    const me = await getJson("ClickUp user", `${API}/user`, { headers });
    const teams = ((await getJson("ClickUp teams", `${API}/team`, { headers })).teams ?? []) as { id: string }[];
    // ClickUp returns at most 100 tasks per page; a full page (or more than three workspaces) means the list is partial.
    let complete = teams.length <= 3;
    const perTeam = await Promise.all(
      teams.slice(0, 3).map(async (t) => {
        const data = await getJson("ClickUp tasks", `${API}/team/${t.id}/task?assignees%5B%5D=${me.user.id}&order_by=updated&reverse=true&subtasks=true&page=0`, { headers });
        const tasks = (data.tasks ?? []) as Record<string, any>[];
        if (tasks.length >= 100) complete = false;
        return tasks;
      }),
    );
    return {
      tasks: perTeam.flat().map(
        (x): ProviderTask => ({
          id: String(x.id),
          title: x.name,
          status: x.status?.status,
          isDone: x.status?.type === "closed" || x.status?.type === "done",
          due: x.due_date ? new Date(Number(x.due_date)).toISOString() : undefined,
          priority: x.priority?.priority ?? undefined,
          container: x.list?.name ?? x.space?.name,
          permalink: x.url,
          updatedAt: new Date(Number(x.date_updated) || Date.now()).toISOString(),
        }),
      ),
      complete,
    };
  },
});
