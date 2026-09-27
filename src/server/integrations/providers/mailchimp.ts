/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const basic = (key: string) => `Basic ${Buffer.from(`stack:${key}`).toString("base64")}`;
/** A Mailchimp key ends with its data centre ("...-us21"); the API lives at that address. */
const dcOf = (key: string) => {
  const dc = key.split("-").pop() ?? "";
  if (!/^[a-z]{2,3}\d{1,2}$/.test(dc)) throw new Error("A Mailchimp API key ends with a region like -us21. Copy the whole key.");
  return dc;
};

/** Your recent Mailchimp campaigns (drafts, scheduled and sent) become messages. */
export const mailchimpProvider = tokenOnlyProvider({
  id: "mailchimp",
  label: "Mailchimp",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Mailchimp API key",
    placeholder: "abc123...-us21",
    helpUrl: "https://us1.admin.mailchimp.com/account/api/",
    steps: [
      "Open the link below (Account > Extras > API keys).",
      "Click Create A Key and name it STACK.",
      "Copy the key (it ends with a region like -us21) and paste it here.",
    ],
    async validate(token) {
      const dc = dcOf(token);
      const root = await getJson("Mailchimp key check", `https://${dc}.api.mailchimp.com/3.0/`, { headers: { Authorization: basic(token) } });
      return { account: root.account_name ?? root.email, metadata: { dc } };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const dc = typeof tokens.metadata?.dc === "string" ? tokens.metadata.dc : dcOf(tokens.accessToken);
    const data = await getJson("Mailchimp campaigns", `https://${dc}.api.mailchimp.com/3.0/campaigns?count=20&sort_field=create_time&sort_dir=DESC`, { headers: { Authorization: basic(tokens.accessToken) } });
    return ((data.campaigns ?? []) as Record<string, any>[]).map((c) => {
      const rate = c.report_summary?.open_rate;
      return {
        id: String(c.id),
        subject: c.settings?.title || c.settings?.subject_line || "Campaign",
        from: "Mailchimp campaign",
        snippet: `${c.status}${c.emails_sent ? `, sent to ${c.emails_sent}` : ""}${typeof rate === "number" ? `, ${(rate * 100).toFixed(0)}% opened` : ""}`,
        receivedAt: c.send_time || c.create_time,
        isUnread: c.status === "schedule" || c.status === "save",
        permalink: c.web_id ? `https://${dc}.admin.mailchimp.com/campaigns/show?id=${c.web_id}` : undefined,
      };
    });
  },
});
