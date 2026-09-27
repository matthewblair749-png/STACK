/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { cleanHost, tokenOnlyProvider } from "./token-only";

const host = (input: string) => cleanHost(input, ".benchling.com", "your-lab.benchling.com");
const h = (key: string) => ({ Authorization: `Basic ${Buffer.from(`${key.trim()}:`).toString("base64")}` });

/** Lab notebook entries you can see in Benchling, most recently modified first, become messages. */
export const benchlingProvider = tokenOnlyProvider({
  id: "benchling",
  label: "Benchling",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Benchling API key",
    placeholder: "sk_...",
    helpUrl: "https://help.benchling.com/hc/en-us/articles/9714802977805",
    steps: [
      "In Benchling open your profile > Settings > Developer Console (or Feature Settings > API Key) and create an API key.",
      "Copy the key. It has your own permissions, so STACK sees only what you can see.",
      "Paste it here with your Benchling address (like your-lab.benchling.com).",
    ],
    fields: [{ name: "domain", label: "Benchling address", placeholder: "your-lab.benchling.com" }],
    async validate(token, fields) {
      const site = host(fields.domain ?? "");
      await getJson("Benchling key check", `https://${site}/api/v2/entries?pageSize=1`, { headers: h(token) });
      return { account: site, metadata: { domain: site } };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const site = tokens.metadata?.domain;
    if (typeof site !== "string") throw new Error("Benchling failed: 401 address missing. Reconnect Benchling.");
    const data = await getJson("Benchling entries", `https://${site}/api/v2/entries?pageSize=30&sort=modifiedAt:desc`, { headers: h(tokens.accessToken) });
    return ((data.entries ?? []) as Record<string, any>[]).map((e) => ({
      id: String(e.id),
      subject: e.name || e.displayId || "Notebook entry",
      from: e.creator?.name ?? e.authors?.[0]?.name ?? "Benchling",
      snippet: `${e.displayId ?? "Entry"} - updated`,
      receivedAt: e.modifiedAt ?? e.createdAt ?? new Date().toISOString(),
      isUnread: false,
      permalink: e.webURL,
    }));
  },
});
