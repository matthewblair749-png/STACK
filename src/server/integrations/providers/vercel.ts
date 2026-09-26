/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const h = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Your recent Vercel deployments become messages; failed ones are flagged so they surface in priorities. */
export const vercelProvider = tokenOnlyProvider({
  id: "vercel",
  label: "Vercel",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Vercel access token",
    placeholder: "Your Vercel token",
    helpUrl: "https://vercel.com/account/tokens",
    steps: [
      "Open the link below and click Create Token. Name it STACK.",
      "Choose an expiry and the scope (your account or team) STACK should read.",
      "Copy the token (shown once) and paste it here.",
    ],
    async validate(token) {
      const data = await getJson("Vercel token check", "https://api.vercel.com/v2/user", { headers: h(token) });
      return { account: data.user?.email ?? data.user?.username };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson("Vercel deployments", "https://api.vercel.com/v6/deployments?limit=25", { headers: h(tokens.accessToken) });
    return ((data.deployments ?? []) as Record<string, any>[]).map((d) => {
      const failed = d.state === "ERROR" || d.readyState === "ERROR";
      return {
        id: String(d.uid),
        subject: `${d.name}: ${failed ? "deployment failed" : String(d.state ?? d.readyState ?? "deployed").toLowerCase()}`,
        from: d.target === "production" ? "Production" : "Preview",
        snippet: String(d.meta?.githubCommitMessage ?? d.meta?.gitlabCommitMessage ?? "").split("\n")[0].slice(0, 120),
        receivedAt: new Date(d.created ?? d.createdAt ?? Date.now()).toISOString(),
        isUnread: failed,
        permalink: d.url ? `https://${d.url}` : undefined,
      };
    });
  },
});
