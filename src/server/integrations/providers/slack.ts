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
  "mpim:history",
  "mpim:read",
].join(",");

/** Each conversation type STACK reads, and the user-token scope that lets conversations.list return it. */
const CONVERSATION_TYPES = [
  { type: "public_channel", scope: "channels:read", label: "public channels" },
  { type: "private_channel", scope: "groups:read", label: "private channels" },
  { type: "im", scope: "im:read", label: "direct messages" },
  { type: "mpim", scope: "mpim:read", label: "group DMs" },
] as const;
type ConversationType = (typeof CONVERSATION_TYPES)[number]["type"];

async function listConversations(token: string, types: string, limit: number) {
  const res = await fetch(`https://slack.com/api/conversations.list?types=${types}&limit=${limit}&exclude_archived=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as { ok: boolean; error?: string; channels?: { id: string; name?: string; is_im?: boolean; user?: string }[] };
}

/**
 * Which conversation types this token can actually list. Checked one type at a time, because a single missing
 * scope makes a combined request fail with missing_scope and return nothing at all.
 */
async function readableTypes(token: string): Promise<{ ok: ConversationType[]; missing: (typeof CONVERSATION_TYPES)[number][] }> {
  const results = await Promise.all(CONVERSATION_TYPES.map(async (t) => ({ t, res: await listConversations(token, t.type, 1) })));
  const bad = results.find((r) => !r.res.ok && r.res.error !== "missing_scope");
  if (bad) throw new Error(`Slack conversations.list failed: ${bad.res.error ?? "unknown_error"}`);
  return { ok: results.filter((r) => r.res.ok).map((r) => r.t.type), missing: results.filter((r) => !r.res.ok).map((r) => r.t) };
}

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
    // Slack's "create from manifest" link pre-fills a private app with exactly the read-only user scopes STACK
    // needs and no bot user - so there's nothing to tick by hand and no bot token to paste by mistake.
    helpUrl: `https://api.slack.com/apps?new_app=1&manifest_json=${encodeURIComponent(
      JSON.stringify({
        display_information: { name: "STACK", description: "Reads your channels and DMs so STACK can show what needs you. Read-only." },
        oauth_config: { scopes: { user: USER_SCOPES.split(",") } },
      }),
    )}`,
    steps: [
      "Click the button below. Slack opens with STACK's read-only settings already filled in - pick your workspace, then click Next and Create.",
      "On the app page, open Install App (left menu), click Install to Workspace, then Allow.",
      "Copy the User OAuth Token shown there (it starts with xoxp-) and paste it on the next screen.",
    ],
    async validate(token) {
      if (token.startsWith("xoxb-")) {
        throw new Error("That's the Bot User OAuth Token (xoxb-). STACK reads your own channels and DMs, so paste the User OAuth Token (xoxp-) from the same OAuth & Permissions page. If there isn't one, add the scopes under User Token Scopes and reinstall.");
      }
      const res = await fetch("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.ok !== true) throw new Error(`Slack rejected that token (${data.error ?? "unknown_error"}). Copy the User OAuth Token again and paste it here.`);
      // Prove the token can actually read conversations now, instead of failing on every sync later.
      const { ok, missing } = await readableTypes(token);
      if (ok.length === 0) {
        throw new Error(`That token can't read any conversations. In your Slack app's OAuth & Permissions page, add these User Token Scopes: ${USER_SCOPES.split(",").join(", ")}. Then click Reinstall to Workspace and paste the new token.`);
      }
      return {
        account: data.user && data.team ? `${data.user} - ${data.team}` : (data.team ?? data.user),
        // Sync reads only what the token allows; anything missing is named so the person can add it later.
        metadata: { teamId: data.team_id, conversationTypes: ok, missingScopes: missing.map((m) => m.scope) },
      };
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
    // A bot token only sees the bot's own DMs - syncing that would look like data but isn't the person's Slack.
    if (tokens.accessToken.startsWith("xoxb-")) throw new Error("Slack bot_token_not_supported");
    // Ask only for the conversation types this token was confirmed to read (older connections didn't record
    // them, so they're worked out on the fly). One missing scope must not stop everything else from syncing.
    const known = Array.isArray(tokens.metadata?.conversationTypes) ? (tokens.metadata!.conversationTypes as string[]) : null;
    let types = known?.length ? known : CONVERSATION_TYPES.map((t) => t.type as string);
    let listData = await listConversations(tokens.accessToken, types.join(","), 20);
    if (!listData.ok && listData.error === "missing_scope") {
      types = (await readableTypes(tokens.accessToken)).ok;
      if (types.length === 0) throw new Error("Slack conversations.list failed: missing_scope (the token has no channel or DM read scopes)");
      listData = await listConversations(tokens.accessToken, types.join(","), 20);
    }
    if (!listData.ok) {
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
