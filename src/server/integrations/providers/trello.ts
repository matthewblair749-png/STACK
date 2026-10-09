/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { getJson } from "../oauth-util";

const apiKey = () => process.env.TRELLO_API_KEY ?? "";

/**
 * Trello has no code-exchange flow: it hands the token back in the URL fragment (which servers never see).
 * So sign-in returns to a small page (/integrations/trello) that reads the fragment and forwards the
 * token to the normal callback as `code`. `exchangeCode` checks the token really works before it is saved.
 */
export const trelloProvider: IntegrationProvider = {
  id: "trello",
  label: "Trello",
  capabilities: ["issues", "messages", "search"],
  tokenConnect: {
    label: "Trello token",
    placeholder: "Your Trello token",
    helpUrl: "https://trello.com/apps/admin",
    steps: [
      "Open the link below (Trello's apps admin) and click New. Choose not to use Power-Up capabilities, name it STACK, pick your Workspace, fill in the email and author fields, and click Create.",
      "Open the new app, go to its Trello Auth tab and click Generate a new API Key. Copy the API key.",
      "Click the Token link next to the key, click Allow, and copy the token it shows.",
      "Paste the API key and the token below.",
    ],
    fields: [{ name: "apiKey", label: "Trello API key", placeholder: "32-character key from your app's Trello Auth tab" }],
    async validate(token, fields) {
      const key = (fields.apiKey ?? "").trim();
      if (!/^[a-f0-9]{32}$/i.test(key)) throw new Error("The API key is 32 letters and numbers, shown on your Trello app's Trello Auth tab (trello.com/apps/admin).");
      const me = await getJson("Trello token check", `https://api.trello.com/1/members/me?fields=username&key=${key}&token=${encodeURIComponent(token)}`, {});
      return { account: me.username, metadata: { apiKey: key } };
    },
  },
  isConfigured: () => !!apiKey(),
  missingSetup: () => (apiKey() ? [] : ["set TRELLO_API_KEY (from trello.com/power-ups/admin)"]),

  getAuthUrl(state, redirectUri) {
    if (!apiKey()) throw new Error("Trello: set TRELLO_API_KEY.");
    const back = new URL("/integrations/trello", redirectUri);
    back.searchParams.set("state", state);
    const url = new URL("https://trello.com/1/authorize");
    url.searchParams.set("key", apiKey());
    url.searchParams.set("name", "STACK");
    url.searchParams.set("response_type", "token");
    url.searchParams.set("scope", "read");
    url.searchParams.set("expiration", "never");
    url.searchParams.set("return_url", back.toString());
    return url.toString();
  },

  async exchangeCode(token) {
    await getJson("Trello sign-in", `https://api.trello.com/1/members/me?fields=id&key=${apiKey()}&token=${encodeURIComponent(token)}`, {});
    return { accessToken: token, scopes: ["read"] };
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    // A connection made with the person's own key carries that key; the app-wide key is only for the OAuth-style flow.
    const key = typeof tokens.metadata?.apiKey === "string" ? tokens.metadata.apiKey : apiKey();
    const data = await getJson(
      "Trello cards",
      `https://api.trello.com/1/members/me/cards?filter=open&fields=name,due,dueComplete,dateLastActivity,url,idBoard&key=${key}&token=${encodeURIComponent(tokens.accessToken)}`,
      {},
    );
    const now = Date.now();
    return (data as Record<string, any>[])
      .sort((a, b) => Date.parse(b.dateLastActivity) - Date.parse(a.dateLastActivity))
      .slice(0, 40)
      .map((c) => {
        const overdue = !!c.due && !c.dueComplete && Date.parse(c.due) < now;
        return {
          id: c.id,
          subject: c.name,
          from: "Trello card",
          snippet: c.due ? `${overdue ? "Overdue since" : "Due"} ${String(c.due).slice(0, 10)} - assigned to you` : "Assigned to you",
          receivedAt: c.dateLastActivity,
          isUnread: overdue,
          permalink: c.url,
        };
      });
  },
};
