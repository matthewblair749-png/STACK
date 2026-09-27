/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("FRESHBOOKS");
const API = "https://api.freshbooks.com";

const tokenCall = (params: Record<string, string>, redirectUri?: string, refreshToken?: string) =>
  tokenRequest(
    "FreshBooks",
    `${API}/auth/oauth/token`,
    { json: true, body: JSON.stringify({ ...params, client_id: env.id(), client_secret: env.secret(), ...(redirectUri ? { redirect_uri: redirectUri } : {}) }) },
    { refreshToken, scopes: ["user:profile:read", "user:invoices:read"] },
  );

const auth = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}`, "Api-Version": "alpha", Accept: "application/json" });

export const freshbooksProvider: IntegrationProvider = {
  id: "freshbooks",
  label: "FreshBooks",
  capabilities: ["messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,

  getAuthUrl(state, redirectUri) {
    env.require("FreshBooks");
    const url = new URL("https://auth.freshbooks.com/oauth/authorize/");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("FreshBooks");
    return tokenCall({ grant_type: "authorization_code", code }, redirectUri);
  },

  refreshAccessToken(refreshToken) {
    env.require("FreshBooks");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, undefined, refreshToken);
  },

  /** Invoices that are sent but not yet paid become messages, most overdue first. */
  async getMessages(tokens): Promise<MailMessage[]> {
    const me = await getJson("FreshBooks profile", `${API}/auth/api/v1/users/me`, { headers: auth(tokens.accessToken) });
    const accountId = me.response?.business_memberships?.[0]?.business?.account_id;
    if (!accountId) throw new Error("FreshBooks failed: 404 no business account found on this login.");
    const data = await getJson(
      "FreshBooks invoices",
      `${API}/accounting/account/${encodeURIComponent(accountId)}/invoices/invoices?per_page=50&sort=due_date`,
      { headers: auth(tokens.accessToken) },
    );
    const now = Date.now();
    return ((data.response?.result?.invoices ?? []) as Record<string, any>[])
      .filter((i) => Number(i.outstanding?.amount ?? 0) > 0 && !/draft|paid|disputed/i.test(String(i.v3_status ?? "")))
      .map((i) => {
        const due = i.due_date ? Date.parse(i.due_date) : NaN;
        const overdue = Number.isFinite(due) && due < now;
        return {
          id: String(i.id),
          subject: `Invoice ${i.invoice_number ?? i.id}${i.outstanding?.amount ? ` - ${i.outstanding.code ?? "$"} ${Number(i.outstanding.amount).toLocaleString("en-US")} outstanding` : ""}`,
          from: i.organization || i.fname || "FreshBooks",
          snippet: `${overdue ? "Overdue" : "Due"} ${i.due_date ?? ""}`.trim(),
          receivedAt: i.updated ? new Date(i.updated.replace(" ", "T") + "Z").toISOString() : new Date().toISOString(),
          isUnread: overdue,
          permalink: `https://my.freshbooks.com/#/invoice/${accountId}-${i.id}`,
        };
      });
  },
};
