import { basicAuth } from "./oauth-util";
import type { ConnectedTokens } from "./provider";

export interface RevokeResult {
  /** True only when the provider confirmed the token no longer works. */
  revoked: boolean;
  /** What to tell the user when it wasn't revoked automatically. */
  note?: string;
}

const env = (n: string) => process.env[n] ?? "";
const form = (o: Record<string, string>) => new URLSearchParams(o).toString();

async function call(url: string, init: RequestInit): Promise<boolean> {
  try {
    const res = await fetch(url, init);
    return res.ok;
  } catch {
    return false;
  }
}

type Revoker = (t: ConnectedTokens) => Promise<boolean>;

/**
 * Providers that expose a token-revocation endpoint. Best effort by design: a failed revoke never blocks
 * disconnecting (STACK still deletes its stored copy of the tokens), but the result is reported honestly.
 */
const REVOKERS: Record<string, Revoker> = {
  google: (t) => call(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(t.refreshToken ?? t.accessToken)}`, { method: "POST" }),
  slack: (t) => call("https://slack.com/api/auth.revoke", { method: "POST", headers: { Authorization: `Bearer ${t.accessToken}` } }),
  dropbox: (t) => call("https://api.dropboxapi.com/2/auth/token/revoke", { method: "POST", headers: { Authorization: `Bearer ${t.accessToken}` } }),
  gitlab: (t) => call("https://gitlab.com/oauth/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form({ client_id: env("GITLAB_CLIENT_ID"), client_secret: env("GITLAB_CLIENT_SECRET"), token: t.accessToken }) }),
  box: (t) => call("https://api.box.com/oauth2/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form({ client_id: env("BOX_CLIENT_ID"), client_secret: env("BOX_CLIENT_SECRET"), token: t.accessToken }) }),
  asana: (t) => call("https://app.asana.com/-/oauth_revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form({ client_id: env("ASANA_CLIENT_ID"), client_secret: env("ASANA_CLIENT_SECRET"), token: t.refreshToken ?? t.accessToken }) }),
  linear: (t) => call("https://api.linear.app/oauth/revoke", { method: "POST", headers: { Authorization: `Bearer ${t.accessToken}` } }),
  salesforce: (t) => call("https://login.salesforce.com/services/oauth2/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form({ token: t.refreshToken ?? t.accessToken }) }),
  github: (t) =>
    call(`https://api.github.com/applications/${env("GITHUB_CLIENT_ID")}/grant`, { method: "DELETE", headers: { Authorization: basicAuth(env("GITHUB_CLIENT_ID"), env("GITHUB_CLIENT_SECRET")), Accept: "application/vnd.github+json", "Content-Type": "application/json" }, body: JSON.stringify({ access_token: t.accessToken }) }),
  trello: (t) => call(`https://api.trello.com/1/tokens/${encodeURIComponent(t.accessToken)}?key=${env("TRELLO_API_KEY")}&token=${encodeURIComponent(t.accessToken)}`, { method: "DELETE" }),
  quickbooks: (t) =>
    call("https://developer.api.intuit.com/v2/oauth2/tokens/revoke", { method: "POST", headers: { Authorization: basicAuth(env("QUICKBOOKS_CLIENT_ID"), env("QUICKBOOKS_CLIENT_SECRET")), "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ token: t.refreshToken ?? t.accessToken }) }),
  hubspot: (t) => (t.refreshToken ? call(`https://api.hubapi.com/oauth/v1/refresh-tokens/${encodeURIComponent(t.refreshToken)}`, { method: "DELETE" }) : Promise.resolve(false)),
};

const MANUAL: Record<string, string> = {
  microsoft: "Microsoft doesn't allow revoking from here. To remove STACK completely, visit account.microsoft.com/privacy/app-access and remove it.",
  notion: "To remove STACK completely, open Notion > Settings > Connections and disconnect it.",
  jira: "To remove STACK completely, visit id.atlassian.com/manage-profile/apps and remove it.",
  figma: "To remove STACK completely, open Figma > Settings > Connected apps and remove it.",
  shopify: "To remove STACK completely, uninstall the app from your Shopify admin > Settings > Apps.",
  stripe: "To remove STACK completely, open Stripe > Settings > Connected accounts and disconnect it.",
};

export async function revokeConnection(providerId: string, tokens: ConnectedTokens): Promise<RevokeResult> {
  const revoke = REVOKERS[providerId];
  if (revoke) {
    const ok = await revoke(tokens);
    return ok ? { revoked: true } : { revoked: false, note: "The provider didn't confirm the revoke. STACK deleted its stored access; you can also remove STACK from the app's own settings." };
  }
  return { revoked: false, note: MANUAL[providerId] ?? "STACK deleted its stored access. You can also remove STACK from the app's own settings." };
}
