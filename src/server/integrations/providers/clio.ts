/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { CalendarEvent, IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("CLIO");
// Clio runs separate regions (app.clio.com US, eu./ca./au.app.clio.com); this connects the US region.
const HOST = "https://app.clio.com";

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Clio",
    `${HOST}/oauth/token`,
    { body: new URLSearchParams({ ...params, client_id: env.id(), client_secret: env.secret() }).toString() },
    { refreshToken, scopes: ["read"] },
  );

const auth = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export const clioProvider: IntegrationProvider = {
  id: "clio",
  label: "Clio",
  capabilities: ["messages", "calendar", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,

  getAuthUrl(state, redirectUri) {
    env.require("Clio");
    const url = new URL(`${HOST}/oauth/authorize`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("Clio");
    return tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refreshAccessToken(refreshToken) {
    env.require("Clio");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  /** Open matters, most recently updated first, become messages. */
  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson(
      "Clio matters",
      `${HOST}/api/v4/matters.json?status=open&order=updated_at(desc)&limit=30&fields=id,display_number,description,status,updated_at,client{name}`,
      { headers: auth(tokens.accessToken) },
    );
    return ((data.data ?? []) as Record<string, any>[]).map((m) => ({
      id: String(m.id),
      subject: `${m.display_number ?? "Matter"}${m.description ? `: ${m.description}` : ""}`,
      from: m.client?.name ?? "Clio",
      snippet: `Matter ${m.status ?? "open"}`,
      receivedAt: m.updated_at ?? new Date().toISOString(),
      isUnread: false,
      permalink: `${HOST}/nc/#/matters/${m.id}`,
    }));
  },

  /** Your court dates, meetings and deadlines for the next 30 days. */
  async getCalendarEvents(tokens): Promise<CalendarEvent[]> {
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const data = await getJson(
      "Clio calendar",
      `${HOST}/api/v4/calendar_entries.json?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=50&fields=id,summary,start_at,end_at,location`,
      { headers: auth(tokens.accessToken) },
    );
    return ((data.data ?? []) as Record<string, any>[])
      .filter((e) => e.start_at)
      .map((e) => ({
        id: String(e.id),
        title: e.summary || "Clio event",
        start: e.start_at,
        end: e.end_at ?? e.start_at,
        location: e.location || undefined,
      }));
  },
};
