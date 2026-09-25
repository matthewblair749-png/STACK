/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("GITLAB");
const SCOPES = ["read_api"];

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "GitLab",
    "https://gitlab.com/oauth/token",
    { body: new URLSearchParams({ ...params, client_id: env.id(), client_secret: env.secret() }).toString() },
    { refreshToken, scopes: SCOPES },
  );

/** GitLab to-dos (review requests, mentions, assignments) become messages so they flow into priorities. */
export const gitlabProvider: IntegrationProvider = {
  id: "gitlab",
  label: "GitLab",
  capabilities: ["issues", "messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,
  tokenConnect: {
    label: "GitLab personal access token",
    placeholder: "glpat-...",
    helpUrl: "https://gitlab.com/-/user_settings/personal_access_tokens?name=STACK&scopes=read_api",
    steps: [
      "Open the link below. GitLab pre-fills the name and the read_api permission.",
      "Set an expiry date and click Create personal access token.",
      "Copy the token (only shown once) and paste it here.",
    ],
    async validate(token) {
      const me = await getJson("GitLab token check", "https://gitlab.com/api/v4/user", { headers: { Authorization: `Bearer ${token}` } });
      return { account: me.username };
    },
  },

  getAuthUrl(state, redirectUri) {
    env.require("GitLab");
    const url = new URL("https://gitlab.com/oauth/authorize");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("GitLab");
    return tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refreshAccessToken(refreshToken) {
    env.require("GitLab");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson("GitLab to-dos", "https://gitlab.com/api/v4/todos?state=pending&per_page=40", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    return (data as Record<string, any>[]).map((t) => ({
      id: String(t.id),
      subject: t.target?.title ?? t.body ?? "(to-do)",
      from: t.author?.name ?? t.project?.path_with_namespace ?? "GitLab",
      snippet: `${String(t.action_name ?? "").replace(/_/g, " ")} - ${t.project?.path_with_namespace ?? ""}`.trim(),
      receivedAt: t.updated_at ?? t.created_at,
      isUnread: t.state === "pending",
      permalink: t.target_url,
    }));
  },
};
