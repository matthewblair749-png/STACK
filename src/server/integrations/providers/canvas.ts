/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { cleanHost, tokenOnlyProvider } from "./token-only";

const host = (input: string) => cleanHost(input, ".instructure.com", "your-school.instructure.com");
const h = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Assignments on your Canvas to-do list become messages; overdue ones are flagged. */
export const canvasProvider = tokenOnlyProvider({
  id: "canvas",
  label: "Canvas",
  capabilities: ["issues", "messages", "search"],
  tokenConnect: {
    label: "Canvas access token",
    placeholder: "Your Canvas access token",
    helpUrl: "https://community.canvaslms.com/t5/Canvas-Basics-Guide/How-do-I-manage-API-access-tokens-in-my-user-account/ta-p/615312",
    steps: [
      "In Canvas open Account > Settings and scroll to Approved Integrations.",
      "Click New Access Token, name it STACK, and click Generate Token.",
      "Copy the token (shown once) and paste it here with your school's Canvas address.",
    ],
    fields: [{ name: "domain", label: "Canvas address", placeholder: "your-school.instructure.com", help: "The address you use to sign in to Canvas." }],
    async validate(token, fields) {
      const site = host(fields.domain ?? "");
      const me = await getJson("Canvas token check", `https://${site}/api/v1/users/self`, { headers: h(token) });
      return { account: me.primary_email ?? me.name, metadata: { domain: site } };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const site = tokens.metadata?.domain;
    if (typeof site !== "string") throw new Error("Canvas failed: 401 school address missing. Reconnect Canvas.");
    const data = await getJson("Canvas to-do", `https://${site}/api/v1/users/self/todo?per_page=30`, { headers: h(tokens.accessToken) });
    const now = Date.now();
    return ((data ?? []) as Record<string, any>[]).map((t, i) => {
      const due = t.assignment?.due_at ? Date.parse(t.assignment.due_at) : null;
      return {
        id: String(t.assignment?.id ?? `${t.context_code}-${i}`),
        subject: t.assignment?.name ?? "Assignment",
        from: t.context_name ?? "Canvas",
        snippet: due ? `${due < now ? "Overdue since" : "Due"} ${new Date(due).toISOString().slice(0, 10)}` : "To do",
        receivedAt: t.assignment?.due_at ?? new Date().toISOString(),
        isUnread: due !== null && due < now,
        permalink: t.html_url ?? t.assignment?.html_url,
      };
    });
  },
});
