/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://api.intercom.io";
const h = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: "application/json", "Intercom-Version": "2.11" });
const plain = (html: unknown) => String(html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Your most recently updated Intercom conversations become messages; unread ones are flagged. */
export const intercomProvider = tokenOnlyProvider({
  id: "intercom",
  label: "Intercom",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Intercom access token",
    placeholder: "dG9rO...",
    helpUrl: "https://app.intercom.com/a/apps/_/developer-hub",
    steps: [
      "Open the link below, then Developer Hub > New app (or pick an existing one).",
      "Under Configure > Authentication, copy the Access Token. Give it read access to conversations only.",
      "Paste it here.",
    ],
    async validate(token) {
      const me = await getJson("Intercom token check", `${API}/me`, { headers: h(token) });
      return { account: me.email ?? me.name };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson("Intercom conversations", `${API}/conversations?per_page=25&order=desc&sort=updated_at`, { headers: h(tokens.accessToken) });
    return ((data.conversations ?? []) as Record<string, any>[]).map((c) => ({
      id: String(c.id),
      subject: c.title || plain(c.source?.subject) || "Conversation",
      from: c.source?.author?.name ?? "Intercom",
      snippet: plain(c.source?.body).slice(0, 140),
      receivedAt: new Date((c.updated_at ?? Date.now() / 1000) * 1000).toISOString(),
      isUnread: c.read === false,
      permalink: `https://app.intercom.com/a/inbox/_/inbox/conversation/${c.id}`,
    }));
  },
});
