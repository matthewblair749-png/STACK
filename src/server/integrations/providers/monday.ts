/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const gql = (token: string, query: string) =>
  getJson("Monday.com", "https://api.monday.com/v2", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json", "API-Version": "2024-10" },
    body: JSON.stringify({ query }),
  });

/** Recently updated items on your busiest monday.com boards become messages. */
export const mondayProvider = tokenOnlyProvider({
  id: "monday",
  label: "Monday.com",
  capabilities: ["issues", "messages", "search"],
  tokenConnect: {
    label: "monday.com API token",
    placeholder: "eyJ...",
    helpUrl: "https://developer.monday.com/api-reference/docs/authentication",
    steps: [
      "In monday.com click your profile picture (top right) > Developers. The Developer Center opens in a new tab.",
      "Click API token, then Show, and copy your personal API token. (Admins can also find it under Administration > Connections > Personal API token.)",
      "Paste it here. STACK reads items on your boards.",
    ],
    async validate(token) {
      const data = await gql(token, "{ me { name email } }");
      if (data.errors?.length || !data.data?.me) throw new Error("Monday.com token check failed: 401");
      return { account: data.data.me.email ?? data.data.me.name };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await gql(tokens.accessToken, "{ boards(limit: 8, order_by: used_at) { name items_page(limit: 12) { items { id name updated_at url } } } }");
    if (data.errors?.length) throw new Error(`Monday.com boards failed: 400 ${data.errors[0].message}`);
    const rows: MailMessage[] = [];
    for (const b of (data.data?.boards ?? []) as Record<string, any>[]) {
      for (const i of (b.items_page?.items ?? []) as Record<string, any>[]) {
        rows.push({ id: String(i.id), subject: i.name, from: b.name, snippet: `Updated on ${b.name}`, receivedAt: i.updated_at ?? new Date().toISOString(), isUnread: false, permalink: i.url });
      }
    }
    return rows.sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt)).slice(0, 40);
  },
});
