/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://harvest.greenhouse.io/v1";
const h = (key: string) => ({ Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` });

/** Candidates with recent activity in your Greenhouse account become messages. */
export const greenhouseProvider = tokenOnlyProvider({
  id: "greenhouse",
  label: "Greenhouse",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Greenhouse Harvest API key",
    placeholder: "Your Harvest API key",
    helpUrl: "https://app.greenhouse.io/configure/dev_center/credentials",
    steps: [
      "Open the link below (Configure > Dev Center > API Credential Management). This needs an admin.",
      "Click Create New API Key, choose Harvest, and name it STACK.",
      "Give it read (GET) access to Candidates, Applications and Jobs only, then copy the key (shown once) and paste it here.",
    ],
    async validate(token) {
      await getJson("Greenhouse key check", `${API}/users?per_page=1`, { headers: h(token) });
      return { account: "Greenhouse" };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const data = await getJson("Greenhouse candidates", `${API}/candidates?per_page=30&updated_after=${encodeURIComponent(since)}`, { headers: h(tokens.accessToken) });
    return ((data ?? []) as Record<string, any>[]).map((c) => {
      const app = (c.applications ?? [])[0] ?? {};
      const job = app.jobs?.[0]?.name;
      return {
        id: String(c.id),
        subject: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Candidate",
        from: job ?? "Greenhouse",
        snippet: [app.current_stage?.name, app.status].filter(Boolean).join(" - ") || "Recent activity",
        receivedAt: c.last_activity ?? c.updated_at,
        isUnread: false,
        permalink: `https://app.greenhouse.io/people/${c.id}`,
      };
    });
  },
});
