/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { ProviderTask, TaskList } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

export const MONDAY_LIMITS = { boards: 25, boardsPerQuery: 5, itemsPerBoard: 100 };

const gql = (token: string, query: string) =>
  getJson("Monday.com", "https://api.monday.com/v2", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json", "API-Version": "2024-10" },
    body: JSON.stringify({ query }),
  });

/** Items assigned to you (through a board's people columns) on your most-used monday.com boards. */
export const mondayProvider = tokenOnlyProvider({
  id: "monday",
  label: "Monday.com",
  capabilities: ["issues", "search"],
  tokenConnect: {
    label: "monday.com API token",
    placeholder: "eyJ...",
    helpUrl: "https://developer.monday.com/api-reference/docs/authentication",
    steps: [
      "In monday.com click your profile picture (top right) > Developers. The Developer Center opens in a new tab.",
      "Click API token, then Show, and copy your personal API token. (Admins can also find it under Administration > Connections > Personal API token.)",
      "Paste it here. STACK reads the items assigned to you on your boards.",
    ],
    async validate(token) {
      const data = await gql(token, "{ me { name email } }");
      if (data.errors?.length || !data.data?.me) throw new Error("Monday.com token check failed: 401");
      return { account: data.data.me.email ?? data.data.me.name };
    },
  },
  async getTasks(tokens): Promise<TaskList> {
    // Which boards you use, and which of their columns hold people (assignees). Column ids differ per board.
    const boardsData = await gql(tokens.accessToken, `{ boards(limit: ${MONDAY_LIMITS.boards}, order_by: used_at) { id name columns(types: [people]) { id } } }`);
    if (boardsData.errors?.length) throw new Error(`Monday.com boards failed: 400 ${boardsData.errors[0].message}`);
    const boards = ((boardsData.data?.boards ?? []) as Record<string, any>[]).filter((b) => (b.columns ?? []).length > 0);

    const tasks: ProviderTask[] = [];
    let complete = (boardsData.data?.boards ?? []).length < MONDAY_LIMITS.boards;
    // Several boards per request (GraphQL aliases) keeps this to a handful of calls.
    for (let i = 0; i < boards.length; i += MONDAY_LIMITS.boardsPerQuery) {
      const chunk = boards.slice(i, i + MONDAY_LIMITS.boardsPerQuery);
      const parts = chunk.map((b, j) => {
        const rules = (b.columns as { id: string }[]).map((c) => `{ column_id: ${JSON.stringify(c.id)}, compare_value: ["assigned_to_me"], operator: any_of }`).join(", ");
        return `b${j}: boards(ids: [${JSON.stringify(String(b.id))}]) { items_page(limit: ${MONDAY_LIMITS.itemsPerBoard}, query_params: { rules: [${rules}], operator: or }) { cursor items { id name updated_at url column_values(types: [date, status]) { id type text ... on DateValue { date } } } } }`;
      });
      const data = await gql(tokens.accessToken, `{ ${parts.join(" ")} }`);
      if (data.errors?.length) throw new Error(`Monday.com items failed: 400 ${data.errors[0].message}`);
      chunk.forEach((b, j) => {
        const page = data.data?.[`b${j}`]?.[0]?.items_page;
        if (page?.cursor) complete = false;
        for (const item of (page?.items ?? []) as Record<string, any>[]) {
          const values = (item.column_values ?? []) as Record<string, any>[];
          const date = values.find((v) => v.type === "date" && v.date)?.date as string | undefined;
          const status = values.find((v) => v.type === "status" && v.text)?.text as string | undefined;
          tasks.push({
            id: String(item.id),
            title: item.name,
            status: status ?? "Assigned to you",
            isDone: /^(done|complete|completed)$/i.test(status ?? ""),
            // A date column's `date` is a plain YYYY-MM-DD (the time, if any, is in the viewer's zone), so it's a whole-day due date.
            due: date || undefined,
            container: b.name,
            permalink: item.url,
            updatedAt: item.updated_at ?? new Date().toISOString(),
          });
        }
      });
    }
    return { tasks, complete };
  },
});
