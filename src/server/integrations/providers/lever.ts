/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://api.lever.co/v1";
const h = (key: string) => ({ Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` });

/** Active candidates (opportunities) in your Lever account, most recently touched first, become messages. */
export const leverProvider = tokenOnlyProvider({
  id: "lever",
  label: "Lever",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Lever API key",
    placeholder: "Your Lever API key",
    helpUrl: "https://hire.lever.co/settings/integrations?tab=api",
    steps: [
      "Open the link below (Settings > Integrations and API > API credentials). This needs an admin.",
      "Click Generate new key and name it STACK.",
      "Give it read access to Opportunities only, then copy the key (shown once) and paste it here.",
    ],
    async validate(token) {
      await getJson("Lever key check", `${API}/users?limit=1`, { headers: h(token) });
      return { account: "Lever" };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson("Lever opportunities", `${API}/opportunities?archived=false&limit=30&expand=stage`, { headers: h(tokens.accessToken) });
    return ((data.data ?? []) as Record<string, any>[])
      .map((o) => ({
        id: String(o.id),
        subject: o.name || "Candidate",
        from: o.headline || "Lever",
        snippet: [o.stage?.text, o.origin].filter(Boolean).join(" - ") || "Active",
        receivedAt: new Date(o.lastInteractionAt ?? o.createdAt ?? Date.now()).toISOString(),
        isUnread: false,
        permalink: o.urls?.show,
      }))
      .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  },
});
