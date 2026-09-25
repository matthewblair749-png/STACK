/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("LINEAR");

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Linear",
    "https://api.linear.app/oauth/token",
    { body: new URLSearchParams({ ...params, client_id: env.id(), client_secret: env.secret() }).toString() },
    { refreshToken, scopes: ["read"] },
  );

/** Personal API keys (lin_api_...) go in the header as-is; OAuth tokens use Bearer. */
const authHeader = (token: string) => (token.startsWith("lin_api_") ? token : `Bearer ${token}`);

const QUERY = `{ viewer { assignedIssues(first: 30, orderBy: updatedAt, filter: { state: { type: { nin: ["completed", "canceled"] } } }) {
  nodes { id identifier title url updatedAt priorityLabel state { name } team { name } } } } }`;

/** Open Linear issues assigned to you become messages. */
export const linearProvider: IntegrationProvider = {
  id: "linear",
  label: "Linear",
  capabilities: ["issues", "messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,
  tokenConnect: {
    label: "Linear personal API key",
    placeholder: "lin_api_...",
    helpUrl: "https://linear.app/settings/account/security",
    steps: [
      "Open the link below and, under Personal API keys, click New API key.",
      "Name it STACK and choose Read permission only.",
      "Copy the key (it starts with lin_api_, shown once) and paste it here.",
    ],
    async validate(token) {
      const data = await getJson("Linear key check", "https://api.linear.app/graphql", {
        method: "POST",
        headers: { Authorization: authHeader(token), "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ viewer { name email } }" }),
      });
      if (data.errors?.length || !data.data?.viewer) throw new Error("Linear key check failed: 401");
      return { account: data.data.viewer.email ?? data.data.viewer.name };
    },
  },

  getAuthUrl(state, redirectUri) {
    env.require("Linear");
    const url = new URL("https://linear.app/oauth/authorize");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "read");
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("Linear");
    return tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refreshAccessToken(refreshToken) {
    env.require("Linear");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson("Linear issues", "https://api.linear.app/graphql", {
      method: "POST",
      headers: { Authorization: authHeader(tokens.accessToken), "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
    });
    if (data.errors?.length) throw new Error(`Linear issues failed: 400 ${data.errors[0].message}`);
    return ((data.data?.viewer?.assignedIssues?.nodes ?? []) as Record<string, any>[]).map((i) => ({
      id: i.id,
      subject: `${i.identifier}: ${i.title}`,
      from: i.team?.name ?? "Linear",
      snippet: [i.state?.name, i.priorityLabel && i.priorityLabel !== "No priority" ? i.priorityLabel : null, "assigned to you"].filter(Boolean).join(" - "),
      receivedAt: i.updatedAt,
      isUnread: false,
      permalink: i.url,
    }));
  },
};
