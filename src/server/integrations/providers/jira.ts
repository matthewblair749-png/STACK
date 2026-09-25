/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("JIRA");
const SCOPES = ["read:jira-work", "read:jira-user", "offline_access"];

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Jira",
    "https://auth.atlassian.com/oauth/token",
    { json: true, body: JSON.stringify({ ...params, client_id: env.id(), client_secret: env.secret() }) },
    { refreshToken, scopes: SCOPES },
  );

/** Open Jira issues assigned to you (across every Atlassian site you granted) become messages. */
export const jiraProvider: IntegrationProvider = {
  id: "jira",
  label: "Jira",
  capabilities: ["issues", "messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,

  getAuthUrl(state, redirectUri) {
    env.require("Jira");
    const url = new URL("https://auth.atlassian.com/authorize");
    url.searchParams.set("audience", "api.atlassian.com");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("prompt", "consent");
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("Jira");
    return tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refreshAccessToken(refreshToken) {
    env.require("Jira");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/json" };
    const sites = (await getJson("Jira sites", "https://api.atlassian.com/oauth/token/accessible-resources", { headers })) as Record<string, any>[];
    const perSite = await Promise.all(
      sites.map(async (site) => {
        const jql = encodeURIComponent("assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC");
        const data = await getJson(
          "Jira issues",
          `https://api.atlassian.com/ex/jira/${site.id}/rest/api/3/search/jql?jql=${jql}&fields=summary,status,updated,project&maxResults=30`,
          { headers },
        );
        return ((data.issues ?? []) as Record<string, any>[]).map((i) => ({
          id: `${site.id}:${i.key}`,
          subject: `${i.key}: ${i.fields?.summary ?? ""}`,
          from: i.fields?.project?.name ?? site.name ?? "Jira",
          snippet: `${i.fields?.status?.name ?? "Open"} - assigned to you`,
          receivedAt: i.fields?.updated,
          isUnread: false,
          permalink: `${site.url}/browse/${i.key}`,
        }));
      }),
    );
    return perSite.flat();
  },
};
