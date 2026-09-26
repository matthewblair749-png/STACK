/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const basic = (email: string, token: string) => `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;

const env = envPair("JIRA");
const SCOPES = ["read:jira-work", "read:jira-user", "offline_access"];

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Jira",
    "https://auth.atlassian.com/oauth/token",
    { json: true, body: JSON.stringify({ ...params, client_id: env.id(), client_secret: env.secret() }) },
    { refreshToken, scopes: SCOPES },
  );

/** "your-team", "your-team.atlassian.net" or a pasted URL -> "your-team.atlassian.net"; anything else is refused. */
function normalizeSite(input: string): string {
  const host = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const site = host.includes(".") ? host : `${host}.atlassian.net`;
  if (!/^[a-z0-9][a-z0-9-]*\.atlassian\.net$/.test(site)) throw new Error("Enter your Jira address, e.g. your-team.atlassian.net.");
  return site;
}

const ISSUE_JQL = encodeURIComponent("assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC");

/** Open Jira issues assigned to you (across every Atlassian site you granted) become messages. */
export const jiraProvider: IntegrationProvider = {
  id: "jira",
  label: "Jira",
  capabilities: ["issues", "messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,
  tokenConnect: {
    label: "Atlassian API token",
    placeholder: "ATATT...",
    helpUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    steps: [
      "Open the link below and click Create API token. Name it STACK.",
      "Copy the token (shown once) and paste it below.",
      "Also enter your Jira address (like your-team.atlassian.net) and the email you sign in with.",
    ],
    fields: [
      { name: "site", label: "Jira address", placeholder: "your-team.atlassian.net" },
      { name: "email", label: "Your Atlassian email", placeholder: "you@company.com" },
    ],
    async validate(token, fields) {
      const site = normalizeSite(fields.site ?? "");
      const email = (fields.email ?? "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter the email you use to sign in to Atlassian.");
      const me = await getJson("Jira token check", `https://${site}/rest/api/3/myself`, { headers: { Authorization: basic(email, token), Accept: "application/json" } });
      return { account: me.emailAddress ?? me.displayName ?? email, metadata: { site, email } };
    },
  },

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
    // Connected with an API token: talk to the site directly with the account's email and token.
    const site = tokens.metadata?.site;
    const email = tokens.metadata?.email;
    if (tokens.metadata?.method === "token" && typeof site === "string" && typeof email === "string") {
      const data = await getJson("Jira issues", `https://${site}/rest/api/3/search/jql?jql=${ISSUE_JQL}&fields=summary,status,updated,project&maxResults=30`, {
        headers: { Authorization: basic(email, tokens.accessToken), Accept: "application/json" },
      });
      return ((data.issues ?? []) as Record<string, any>[]).map((i) => ({
        id: `${site}:${i.key}`,
        subject: `${i.key}: ${i.fields?.summary ?? ""}`,
        from: i.fields?.project?.name ?? "Jira",
        snippet: `${i.fields?.status?.name ?? "Open"} - assigned to you`,
        receivedAt: i.fields?.updated,
        isUnread: false,
        permalink: `https://${site}/browse/${i.key}`,
      }));
    }
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
