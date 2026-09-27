/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { cleanHost, tokenOnlyProvider } from "./token-only";

const basic = (email: string, key: string) => `Basic ${Buffer.from(`${email}:${key}`).toString("base64")}`;
const host = (input: string) => cleanHost(input, ".gorgias.com", "your-store.gorgias.com");

/** Open Gorgias support tickets, most recently updated first; unread ones are flagged. */
export const gorgiasProvider = tokenOnlyProvider({
  id: "gorgias",
  label: "Gorgias",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Gorgias REST API key",
    placeholder: "Your Gorgias API key",
    helpUrl: "https://developers.gorgias.com/docs/authentication",
    steps: [
      "In Gorgias open Settings > REST API and copy your API key.",
      "Also note the email shown on that page (your username).",
      "Paste the key here with your Gorgias address and that email.",
    ],
    fields: [
      { name: "domain", label: "Gorgias address", placeholder: "your-store.gorgias.com" },
      { name: "email", label: "API username (email)", placeholder: "you@company.com" },
    ],
    async validate(token, fields) {
      const site = host(fields.domain ?? "");
      const email = (fields.email ?? "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter the email shown on Gorgias's REST API page.");
      const acct = await getJson("Gorgias key check", `https://${site}/api/account`, { headers: { Authorization: basic(email, token) } });
      return { account: acct.domain ?? site, metadata: { domain: site, email } };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const site = tokens.metadata?.domain;
    const email = tokens.metadata?.email;
    if (typeof site !== "string" || typeof email !== "string") throw new Error("Gorgias failed: 401 account details missing. Reconnect Gorgias.");
    const data = await getJson("Gorgias tickets", `https://${site}/api/tickets?limit=30&order_by=updated_datetime:desc`, { headers: { Authorization: basic(email, tokens.accessToken) } });
    return ((data.data ?? []) as Record<string, any>[])
      .filter((t) => t.status === "open")
      .map((t) => ({
        id: String(t.id),
        subject: t.subject || "(no subject)",
        from: t.customer?.name ?? t.customer?.email ?? "Gorgias ticket",
        snippet: String(t.excerpt ?? "").replace(/\s+/g, " ").slice(0, 120),
        receivedAt: t.updated_datetime ?? t.created_datetime,
        isUnread: t.is_unread === true,
        permalink: `https://${site}/app/ticket/${t.id}`,
      }));
  },
});
