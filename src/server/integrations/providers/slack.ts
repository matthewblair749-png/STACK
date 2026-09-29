import type { ConnectedTokens, IntegrationProvider, MailMessage } from "../provider";
import { ProviderNotConfiguredError } from "../provider";

// Real user-token OAuth v2 flow. We request `user_scope` (not `scope`, which
// would be bot scopes) because STACK reads the *connecting user's own*
// channels/DMs, not a bot's. groups:read/im:read/mpim:read are included even
// though the brief only named four scopes — conversations.list needs them to
// enumerate private channels and DMs, not just public channels.
const USER_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "im:history",
  "im:read",
  "mpim:read",
].join(",");

function envVars() {
  return ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"];
}

function isConfigured() {
  return !!process.env.SLACK_CLIENT_ID && !!process.env.SLACK_CLIENT_SECRET;
}

function requireConfigured() {
  if (!isConfigured()) {
    throw new ProviderNotConfiguredError("Slack", [`set ${envVars().join(" and ")}`]);
  }
}

async function slackAuthedUserToken(code: string, redirectUri: string) {
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
  });
  // Slack's Web API always returns HTTP 200 — success/failure is in `ok`.
  const data = await res.json();
  if (data.ok !== true) {
    throw new Error(`Slack token exchange failed: ${data.error ?? "unknown_error"}`);
  }
  return data;
}

export const slackProvider: IntegrationProvider = {
  id: "slack",
  label: "Slack",
  capabilities: ["messages", "search"],
  isConfigured,
  missingSetup: () => (isConfigured() ? [] : [`set ${envVars().join(" and ")}`]),
  tokenConnect: {
    label: "Slack User OAuth Token",
    placeholder: "xoxp-...",
    helpUrl: "https://api.slack.com/apps?new_app=1",
    steps: [
      "Open the link below and create an app From scratch, in the workspace you want STACK to read.",
      `Open OAuth & Permissions and add these User Token Scopes: ${USER_SCOPES.split(",").join(", ")}.`,
      "Click Install to Workspace at the top of that page and allow access.",
      "Copy the User OAuth Token (starts with xoxp-) and paste it here.",
    ],
    async validate(token) {
      const res = await fetch("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.ok !== true) throw new Error(`Slack rejected that token: ${data.error ?? "unknown_error"}`);
      return { account: data.user && data.team ? `${data.user} - ${data.team}` : (data.team ?? data.user) };
    },
  },

  getAuthUrl(state, redirectUri) {
    requireConfigured();
    const url = new URL("https://slack.com/oauth/v2/authorize");
    url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("user_scope", USER_SCOPES);
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(code, redirectUri): Promise<ConnectedTokens> {
    requireConfigured();
    const data = await slackAuthedUserToken(code, redirectUri);
    const authedUser = data.authed_user ?? {};
    return {
      accessToken: authedUser.access_token,
      refreshToken: authedUser.refresh_token,
      expiresAt: authedUser.expires_in ? new Date(Date.now() + authedUser.expires_in * 1000) : undefined,
      scopes: typeof authedUser.scope === "string" ? authedUser.scope.split(",") : USER_SCOPES.split(","),
      metadata: { teamId: data.team?.id, teamName: data.team?.name },
    };
  },

  async refreshAccessToken(refreshToken): Promise<ConnectedTokens> {
    requireConfigured();
    const res = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const data = await res.json();
    if (data.ok !== true) {
      throw new Error(`Slack token refresh failed: ${data.error ?? "unknown_error"}`);
    }
    const authedUser = data.authed_user ?? data;
    return {
      accessToken: authedUser.access_token,
      refreshToken: authedUser.refresh_token ?? refreshToken,
      expiresAt: authedUser.expires_in ? new Date(Date.now() + authedUser.expires_in * 1000) : undefined,
      scopes: typeof authedUser.scope === "string" ? authedUser.scope.split(",") : USER_SCOPES.split(","),
    };
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}` };
    const listRes = await fetch(
      "https://slack.com/api/conversations.list?types=public_channel,private_channel,mpim,im&limit=20&exclude_archived=true",
      { headers }
    );
    const listData = await listRes.json();
    if (listData.ok !== true) {
      throw new Error(`Slack conversations.list failed: ${listData.error ?? "unknown_error"}`);
    }
    type Channel = { id: string; name?: string; is_im?: boolean; user?: string };
    const channels: Channel[] = (listData.channels ?? []).slice(0, 8);

    const perChannel = await Promise.all(
      channels.map(async (ch) => {
        const histRes = await fetch(
          `https://slack.com/api/conversations.history?channel=${ch.id}&limit=15`,
          { headers }
        );
        const histData = await histRes.json();
        if (histData.ok !== true) return [];
        type Msg = { ts: string; text?: string; user?: string };
        const label = ch.is_im ? "Direct message" : ch.name ? `#${ch.name}` : ch.id;
        return ((histData.messages ?? []) as Msg[]).map(
          (m): MailMessage => ({
            id: `${ch.id}-${m.ts}`,
            threadId: ch.id,
            subject: label,
            from: m.user ?? "unknown",
            snippet: (m.text ?? "").slice(0, 280),
            receivedAt: new Date(Number(m.ts) * 1000).toISOString(),
            permalink: `slack://channel?id=${ch.id}`,
          })
        );
      })
    );
    return perChannel.flat();
  },
};
