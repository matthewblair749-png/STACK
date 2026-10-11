/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, ProviderTask, TaskList } from "../provider";
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
  capabilities: ["issues", "search"],
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

  async getTasks(tokens): Promise<TaskList> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}` };
    const me = await getJson("Asana user", "https://app.asana.com/api/1.0/users/me?opt_fields=workspaces.gid", { headers });
    const workspaces = (me.data?.workspaces ?? []) as { gid: string }[];
    let complete = true;
    const perWorkspace = await Promise.all(
      workspaces.map(async (w) => {
        // completed_since=now returns only tasks that aren't complete.
        const data = await getJson(
          "Asana tasks",
          `https://app.asana.com/api/1.0/tasks?assignee=me&workspace=${w.gid}&completed_since=now&limit=100&opt_fields=name,completed,due_on,due_at,modified_at,permalink_url,projects.name`,
          { headers },
        );
        if (data.next_page) complete = false;
        return ((data.data ?? []) as Record<string, any>[]).map(
          (t): ProviderTask => ({
            id: t.gid,
            title: t.name || "(untitled task)",
            status: t.completed ? "Completed" : "Open",
            isDone: !!t.completed,
            due: t.due_at ?? t.due_on ?? undefined,
            container: t.projects?.[0]?.name,
            permalink: t.permalink_url,
            updatedAt: t.modified_at,
          }),
        );
      }),
    );
    return { tasks: perWorkspace.flat(), complete };
  },
};
