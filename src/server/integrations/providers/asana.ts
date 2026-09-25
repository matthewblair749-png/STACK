/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("ASANA");

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Asana",
    "https://app.asana.com/-/oauth_token",
    { body: new URLSearchParams({ ...params, client_id: env.id(), client_secret: env.secret() }).toString() },
    { refreshToken, scopes: ["default"] },
  );

/** Incomplete Asana tasks assigned to you (in every workspace) become messages. */
export const asanaProvider: IntegrationProvider = {
  id: "asana",
  label: "Asana",
  capabilities: ["issues", "messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,
  tokenConnect: {
    label: "Asana personal access token",
    placeholder: "1/1234567890:abcdef...",
    helpUrl: "https://app.asana.com/0/my-apps",
    steps: [
      "Open the link below and, under Personal access tokens, click Create new token.",
      "Name it STACK, accept the terms, and click Create token.",
      "Copy the token (only shown once) and paste it here.",
    ],
    async validate(token) {
      const me = await getJson("Asana token check", "https://app.asana.com/api/1.0/users/me", { headers: { Authorization: `Bearer ${token}` } });
      return { account: me.data?.email ?? me.data?.name };
    },
  },

  getAuthUrl(state, redirectUri) {
    env.require("Asana");
    const url = new URL("https://app.asana.com/-/oauth_authorize");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("Asana");
    return tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refreshAccessToken(refreshToken) {
    env.require("Asana");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}` };
    const me = await getJson("Asana user", "https://app.asana.com/api/1.0/users/me?opt_fields=workspaces.gid", { headers });
    const workspaces = (me.data?.workspaces ?? []) as { gid: string }[];
    const perWorkspace = await Promise.all(
      workspaces.map(async (w) => {
        const data = await getJson(
          "Asana tasks",
          `https://app.asana.com/api/1.0/tasks?assignee=me&workspace=${w.gid}&completed_since=now&limit=30&opt_fields=name,due_on,modified_at,permalink_url,projects.name`,
          { headers },
        );
        return ((data.data ?? []) as Record<string, any>[]).map((t) => ({
          id: t.gid,
          subject: t.name || "(untitled task)",
          from: t.projects?.[0]?.name ?? "Asana",
          snippet: t.due_on ? `Due ${t.due_on} - assigned to you` : "Assigned to you",
          receivedAt: t.modified_at,
          isUnread: false,
          permalink: t.permalink_url,
        }));
      }),
    );
    return perWorkspace.flat();
  },
};
