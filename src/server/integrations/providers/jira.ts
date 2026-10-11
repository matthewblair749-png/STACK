/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, ProviderTask, TaskList } from "../provider";
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

/** Open Jira issues assigned to you (across every Atlassian site you granted), with real status and due date. */
export const jiraProvider: IntegrationProvider = {
  id: "jira",
  label: "Jira",
  capabilities: ["issues", "search"],
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

  async getTasks(tokens): Promise<TaskList> {
    const FIELDS = "summary,status,updated,project,duedate,priority";
    const toTask = (i: Record<string, any>, idPrefix: string, browseBase: string, fallbackContainer?: string): ProviderTask => ({
      id: `${idPrefix}:${i.key}`,
      title: `${i.key}: ${i.fields?.summary ?? ""}`,
      status: i.fields?.status?.name,
      isDone: i.fields?.status?.statusCategory?.key === "done",
      due: i.fields?.duedate ?? undefined,
      priority: i.fields?.priority?.name,
      container: i.fields?.project?.name ?? fallbackContainer,
      permalink: `${browseBase}/browse/${i.key}`,
      updatedAt: i.fields?.updated,
    });
    // More issues than one read returns: the list is a sample, so missing ones mustn't be treated as resolved.
    const isComplete = (data: Record<string, any>) => data.isLast !== false && !data.nextPageToken;

    // Connected with an API token: talk to the site directly with the account's email and token.
    const site = tokens.metadata?.site;
    const email = tokens.metadata?.email;
    if (tokens.metadata?.method === "token" && typeof site === "string" && typeof email === "string") {
      const data = await getJson("Jira issues", `https://${site}/rest/api/3/search/jql?jql=${ISSUE_JQL}&fields=${FIELDS}&maxResults=100`, {
        headers: { Authorization: basic(email, tokens.accessToken), Accept: "application/json" },
      });
      return { tasks: ((data.issues ?? []) as Record<string, any>[]).map((i) => toTask(i, site, `https://${site}`)), complete: isComplete(data) };
    }
    const headers = { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/json" };
    const sites = (await getJson("Jira sites", "https://api.atlassian.com/oauth/token/accessible-resources", { headers })) as Record<string, any>[];
    let complete = true;
    const perSite = await Promise.all(
      sites.map(async (s) => {
        const data = await getJson("Jira issues", `https://api.atlassian.com/ex/jira/${s.id}/rest/api/3/search/jql?jql=${ISSUE_JQL}&fields=${FIELDS}&maxResults=100`, { headers });
        if (!isComplete(data)) complete = false;
        return ((data.issues ?? []) as Record<string, any>[]).map((i) => toTask(i, s.id, s.url, s.name));
      }),
    );
    return { tasks: perSite.flat(), complete };
  },
};
