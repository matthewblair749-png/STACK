/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://api.netlify.com/api/v1";
const h = (token: string) => ({ Authorization: `Bearer ${token}` });

/** The latest deploy of each of your Netlify sites becomes a message; failed ones are flagged. */
export const netlifyProvider = tokenOnlyProvider({
  id: "netlify",
  label: "Netlify",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Netlify personal access token",
    placeholder: "nfp_...",
    helpUrl: "https://app.netlify.com/user/applications#personal-access-tokens",
    steps: [
      "Open the link below and, under Personal access tokens, click New access token.",
      "Name it STACK, choose an expiry, and click Generate token.",
      "Copy the token (shown once) and paste it here.",
    ],
    async validate(token) {
      const me = await getJson("Netlify token check", `${API}/user`, { headers: h(token) });
      return { account: me.email ?? me.full_name };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const headers = h(tokens.accessToken);
    const sites = (await getJson("Netlify sites", `${API}/sites?per_page=10`, { headers })) as Record<string, any>[];
    const latest = await Promise.all(
      sites.slice(0, 8).map(async (s) => {
        const deploys = (await getJson("Netlify deploys", `${API}/sites/${s.id}/deploys?per_page=1`, { headers })) as Record<string, any>[];
        return { site: s, deploy: deploys[0] };
      }),
    );
    return latest
      .filter((x) => x.deploy)
      .map(({ site, deploy }) => {
        const failed = deploy.state === "error";
        return {
          id: String(deploy.id),
          subject: `${site.name}: ${failed ? "deploy failed" : `deploy ${deploy.state}`}`,
          from: deploy.context === "production" ? "Production" : "Preview",
          snippet: String(failed ? (deploy.error_message ?? "The build failed.") : (deploy.title ?? "")).slice(0, 120),
          receivedAt: deploy.created_at,
          isUnread: failed,
          permalink: site.admin_url ? `${site.admin_url}/deploys/${deploy.id}` : site.url,
        };
      });
  },
});
