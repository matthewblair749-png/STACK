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
    const data = await getJson(
      "Trello cards",
      `https://api.trello.com/1/members/me/cards?filter=open&fields=name,due,dueComplete,dateLastActivity,url,idBoard&key=${apiKey()}&token=${encodeURIComponent(tokens.accessToken)}`,
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
