/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("SALESFORCE");
const SCOPES = ["api", "refresh_token"];
const LOGIN = "https://login.salesforce.com/services/oauth2";

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Salesforce",
    `${LOGIN}/token`,
    { body: new URLSearchParams({ ...params, client_id: env.id(), client_secret: env.secret() }).toString() },
    { refreshToken, scopes: SCOPES },
  );

/** Open Salesforce opportunities you own, most recently changed first, become messages. */
export const salesforceProvider: IntegrationProvider = {
  id: "salesforce",
  label: "Salesforce",
  capabilities: ["messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,

  getAuthUrl(state, redirectUri) {
    env.require("Salesforce");
    const url = new URL(`${LOGIN}/authorize`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("Salesforce");
    return tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refreshAccessToken(refreshToken) {
    env.require("Salesforce");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}` };
    // The org's own API address is only known after sign-in; userinfo tells us where it lives.
    const info = await getJson("Salesforce userinfo", `${LOGIN}/userinfo`, { headers });
    const rest = String(info.urls?.rest ?? "").replace("{version}", "60.0");
    if (!rest) throw new Error("Salesforce userinfo failed: 400 no instance URL returned");
    const origin = new URL(rest).origin;
    const soql = "SELECT Id,Name,StageName,Amount,CloseDate,LastModifiedDate FROM Opportunity WHERE IsClosed = false AND OwnerId = '" + info.user_id + "' ORDER BY LastModifiedDate DESC LIMIT 30";
    const data = await getJson("Salesforce opportunities", `${rest}query?q=${encodeURIComponent(soql)}`, { headers });
    return ((data.records ?? []) as Record<string, any>[]).map((o) => ({
      id: o.Id,
      subject: o.Name,
      from: "Salesforce opportunity",
      snippet: [o.StageName, o.Amount ? `$${Number(o.Amount).toLocaleString("en-US")}` : null, o.CloseDate ? `closes ${o.CloseDate}` : null].filter(Boolean).join(" - "),
      receivedAt: o.LastModifiedDate,
      isUnread: false,
      permalink: `${origin}/${o.Id}`,
    }));
  },
};
