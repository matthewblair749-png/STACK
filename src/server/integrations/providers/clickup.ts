/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://api.clickup.com/api/v2";
// ClickUp personal tokens go in the header as-is (no "Bearer").
const h = (token: string) => ({ Authorization: token });

/** Open ClickUp tasks assigned to you, newest activity first, become messages. */
export const clickupProvider = tokenOnlyProvider({
  id: "clickup",
  label: "ClickUp",
  capabilities: ["issues", "messages", "search"],
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
  async getMessages(tokens): Promise<MailMessage[]> {
    const headers = h(tokens.accessToken);
    const me = await getJson("ClickUp user", `${API}/user`, { headers });
    const teams = await getJson("ClickUp teams", `${API}/team`, { headers });
    const perTeam = await Promise.all(
      ((teams.teams ?? []) as { id: string }[]).slice(0, 3).map(async (t) => {
        const data = await getJson("ClickUp tasks", `${API}/team/${t.id}/task?assignees%5B%5D=${me.user.id}&order_by=updated&reverse=true&subtasks=true`, { headers });
        return (data.tasks ?? []) as Record<string, any>[];
      }),
    );
    const now = Date.now();
    return perTeam.flat().slice(0, 40).map((x) => {
      const due = x.due_date ? Number(x.due_date) : null;
      const overdue = due !== null && due < now;
      return {
        id: String(x.id),
        subject: x.name,
        from: x.list?.name ?? x.space?.name ?? "ClickUp",
        snippet: `${x.status?.status ?? "Open"}${due ? `, ${overdue ? "overdue since" : "due"} ${new Date(due).toISOString().slice(0, 10)}` : ""} - assigned to you`,
        receivedAt: new Date(Number(x.date_updated) || now).toISOString(),
        isUnread: overdue,
        permalink: x.url,
      };
    });
  },
});
