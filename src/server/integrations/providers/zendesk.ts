/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { cleanHost, tokenOnlyProvider } from "./token-only";

const basic = (email: string, token: string) => `Basic ${Buffer.from(`${email}/token:${token}`).toString("base64")}`;
const host = (input: string) => cleanHost(input, ".zendesk.com", "your-company.zendesk.com");

/** Open Zendesk tickets assigned to you become messages; urgent and high-priority ones are flagged. */
export const zendeskProvider = tokenOnlyProvider({
  id: "zendesk",
  label: "Zendesk",
  capabilities: ["issues", "messages", "search"],
  tokenConnect: {
    label: "Zendesk API token",
    placeholder: "Your Zendesk API token",
    helpUrl: "https://support.zendesk.com/hc/en-us/articles/4408889192858",
    steps: [
      "In Zendesk open Admin Center > Apps and integrations > APIs > Zendesk API, and turn on Token access.",
      "Click Add API token, name it STACK, and copy the token (shown once).",
      "Paste it here with your Zendesk address and the email you sign in with.",
    ],
    fields: [
      { name: "subdomain", label: "Zendesk address", placeholder: "your-company.zendesk.com" },
      { name: "email", label: "Your Zendesk email", placeholder: "you@company.com" },
    ],
    async validate(token, fields) {
      const site = host(fields.subdomain ?? "");
      const email = (fields.email ?? "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter the email you sign in to Zendesk with.");
      const me = await getJson("Zendesk token check", `https://${site}/api/v2/users/me.json`, { headers: { Authorization: basic(email, token) } });
      return { account: me.user?.email ?? email, metadata: { subdomain: site, email } };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const site = tokens.metadata?.subdomain;
    const email = tokens.metadata?.email;
    if (typeof site !== "string" || typeof email !== "string") throw new Error("Zendesk failed: 401 account details missing. Reconnect Zendesk.");
    const q = encodeURIComponent("type:ticket assignee:me status<solved");
    const data = await getJson("Zendesk tickets", `https://${site}/api/v2/search.json?query=${q}&sort_by=updated_at&sort_order=desc&per_page=30`, { headers: { Authorization: basic(email, tokens.accessToken) } });
    return ((data.results ?? []) as Record<string, any>[]).map((t) => ({
      id: String(t.id),
      subject: t.subject || "(no subject)",
      from: "Zendesk ticket",
      snippet: `${t.status}${t.priority ? `, ${t.priority} priority` : ""} - ${String(t.description ?? "").replace(/\s+/g, " ").slice(0, 100)}`,
      receivedAt: t.updated_at,
      isUnread: t.priority === "urgent" || t.priority === "high",
      permalink: `https://${site}/agent/tickets/${t.id}`,
    }));
  },
});
