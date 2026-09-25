/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("HUBSPOT");
const SCOPES = ["crm.objects.deals.read", "crm.objects.contacts.read"];

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "HubSpot",
    "https://api.hubapi.com/oauth/v1/token",
    { body: new URLSearchParams({ ...params, client_id: env.id(), client_secret: env.secret() }).toString() },
    { refreshToken, scopes: SCOPES },
  );

/** Recently changed HubSpot deals become messages, so a deal that moves shows up in priorities. */
export const hubspotProvider: IntegrationProvider = {
  id: "hubspot",
  label: "HubSpot",
  capabilities: ["messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,
  tokenConnect: {
    label: "HubSpot private app token",
    placeholder: "pat-na1-...",
    helpUrl: "https://app.hubspot.com/l/private-apps",
    steps: [
      "Open the link below and click Create a private app. Name it STACK.",
      "On the Scopes tab, add crm.objects.deals.read and crm.objects.contacts.read only.",
      "Click Create app, then copy the access token (starts with pat-) and paste it here.",
    ],
    async validate(token) {
      await getJson("HubSpot token check", "https://api.hubapi.com/crm/v3/objects/deals?limit=1", { headers: { Authorization: `Bearer ${token}` } });
      return { account: "HubSpot" };
    },
  },

  getAuthUrl(state, redirectUri) {
    env.require("HubSpot");
    const url = new URL("https://app.hubspot.com/oauth/authorize");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("HubSpot");
    return tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refreshAccessToken(refreshToken) {
    env.require("HubSpot");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" };
    const [info, deals] = await Promise.all([
      // OAuth tokens can be looked up for their portal id; a private app token can't, so links fall back to HubSpot's home.
      getJson("HubSpot account", `https://api.hubapi.com/oauth/v1/access-tokens/${encodeURIComponent(tokens.accessToken)}`, { headers }).catch(() => ({ hub_id: undefined as number | undefined })),
      getJson("HubSpot deals", "https://api.hubapi.com/crm/v3/objects/deals/search", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
          properties: ["dealname", "amount", "dealstage", "closedate", "hs_lastmodifieddate"],
          limit: 30,
        }),
      }),
    ]);
    return ((deals.results ?? []) as Record<string, any>[]).map((d) => {
      const p = d.properties ?? {};
      return {
        id: String(d.id),
        subject: p.dealname || "(untitled deal)",
        from: "HubSpot deal",
        snippet: [p.dealstage, p.amount ? `$${Number(p.amount).toLocaleString("en-US")}` : null, p.closedate ? `closes ${String(p.closedate).slice(0, 10)}` : null].filter(Boolean).join(" - "),
        receivedAt: p.hs_lastmodifieddate ?? d.updatedAt,
        isUnread: false,
        permalink: info.hub_id ? `https://app.hubspot.com/contacts/${info.hub_id}/record/0-3/${d.id}` : "https://app.hubspot.com/",
      };
    });
  },
};
