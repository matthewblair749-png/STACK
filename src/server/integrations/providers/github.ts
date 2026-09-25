/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const SCOPES = ["read:user", "notifications", "repo"];
const env = envPair("GITHUB");

/** API URLs (api.github.com/repos/o/r/pulls/1) -> the page a person would open. */
function toWebUrl(apiUrl: string | undefined, repo: string): string {
  if (!apiUrl) return `https://github.com/${repo}`;
  return apiUrl.replace("https://api.github.com/repos/", "https://github.com/").replace("/pulls/", "/pull/").replace(/\/commits\//, "/commit/");
}

/** GitHub notifications (review requests, mentions, assigned issues, CI) become messages, so they flow into priorities. */
export const githubProvider: IntegrationProvider = {
  id: "github",
  label: "GitHub",
  capabilities: ["issues", "messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,
  tokenConnect: {
    label: "GitHub personal access token",
    placeholder: "ghp_... or github_pat_...",
    helpUrl: "https://github.com/settings/tokens/new?scopes=notifications,read:user,repo&description=STACK",
    steps: [
      "Open the link below. GitHub pre-selects the read permissions STACK needs (notifications, read:user, repo).",
      "Set an expiration you're comfortable with and click Generate token.",
      "Copy the token (it's only shown once) and paste it here.",
    ],
    async validate(token) {
      const me = await getJson("GitHub token check", "https://api.github.com/user", { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
      return { account: me.login };
    },
  },

  getAuthUrl(state, redirectUri) {
    env.require("GitHub");
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(code, redirectUri) {
    env.require("GitHub");
    return tokenRequest(
      "GitHub",
      "https://github.com/login/oauth/access_token",
      { body: new URLSearchParams({ client_id: env.id(), client_secret: env.secret(), code, redirect_uri: redirectUri }).toString() },
      { scopes: SCOPES },
    );
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson("GitHub notifications", "https://api.github.com/notifications?all=true&per_page=40", {
      headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    return (data as Record<string, any>[]).map((n) => {
      const repo = n.repository?.full_name ?? "GitHub";
      return {
        id: String(n.id),
        subject: n.subject?.title ?? "(notification)",
        from: repo,
        snippet: `${String(n.reason ?? "").replace(/_/g, " ")} - ${n.subject?.type ?? "activity"} in ${repo}`,
        receivedAt: n.updated_at,
        isUnread: !!n.unread,
        permalink: toWebUrl(n.subject?.url, repo),
      } satisfies MailMessage;
    });
  },
};
