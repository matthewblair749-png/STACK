/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { basicAuth, envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("QUICKBOOKS");
const SCOPES = ["com.intuit.quickbooks.accounting"];

const apiBase = () => (process.env.QUICKBOOKS_SANDBOX === "true" ? "https://sandbox-quickbooks.api.intuit.com" : "https://quickbooks.api.intuit.com");

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "QuickBooks",
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    { headers: { Authorization: basicAuth(env.id(), env.secret()) }, body: new URLSearchParams(params).toString() },
    { refreshToken, scopes: SCOPES },
  );

/** Unpaid QuickBooks invoices become messages; overdue ones are flagged unread so they rise in priorities. */
export const quickbooksProvider: IntegrationProvider = {
  id: "quickbooks",
  label: "QuickBooks",
  capabilities: ["messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,

  getAuthUrl(state, redirectUri) {
    env.require("QuickBooks");
    const url = new URL("https://appcenter.intuit.com/connect/oauth2");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(code, redirectUri, ctx) {
    env.require("QuickBooks");
    // Intuit sends the company ("realm") id back on the redirect; every later API call needs it.
    const realmId = ctx?.query.get("realmId");
    if (!realmId) throw new Error("QuickBooks didn't return a company id. Try connecting again and pick a company.");
    const tokens = await tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
    return { ...tokens, metadata: { realmId } };
  },

  refreshAccessToken(refreshToken) {
    env.require("QuickBooks");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const realmId = tokens.metadata?.realmId;
    if (typeof realmId !== "string") throw new Error("QuickBooks failed: 401 company not recorded. Reconnect QuickBooks.");
    const query = encodeURIComponent("select * from Invoice where Balance > '0' orderby DueDate maxresults 30");
    const data = await getJson("QuickBooks invoices", `${apiBase()}/v3/company/${realmId}/query?query=${query}&minorversion=75`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/json" },
    });
    const today = new Date().toISOString().slice(0, 10);
    return ((data.QueryResponse?.Invoice ?? []) as Record<string, any>[]).map((i) => {
      const overdue = !!i.DueDate && i.DueDate < today;
      return {
        id: String(i.Id),
        subject: `Invoice ${i.DocNumber ?? i.Id} - ${i.CustomerRef?.name ?? "customer"}`,
        from: i.CustomerRef?.name ?? "QuickBooks",
        snippet: `$${Number(i.Balance).toLocaleString("en-US")} outstanding${i.DueDate ? `, ${overdue ? "overdue since" : "due"} ${i.DueDate}` : ""}`,
        receivedAt: i.MetaData?.LastUpdatedTime ?? new Date().toISOString(),
        isUnread: overdue,
        permalink: `https://app.qbo.intuit.com/app/invoice?txnId=${i.Id}`,
      };
    });
  },
};
