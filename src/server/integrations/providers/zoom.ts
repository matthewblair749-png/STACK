/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { CalendarEvent, IntegrationProvider } from "../provider";
import { basicAuth, envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("ZOOM");
const SCOPES = ["meeting:read"];

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Zoom",
    "https://zoom.us/oauth/token",
    { headers: { Authorization: basicAuth(env.id(), env.secret()) }, body: new URLSearchParams(params).toString() },
    { refreshToken, scopes: SCOPES },
  );

/** Upcoming Zoom meetings appear alongside calendar events. */
export const zoomProvider: IntegrationProvider = {
  id: "zoom",
  label: "Zoom",
  capabilities: ["meetings", "calendar"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,

  getAuthUrl(state, redirectUri) {
    env.require("Zoom");
    const url = new URL("https://zoom.us/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("Zoom");
    return tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refreshAccessToken(refreshToken) {
    env.require("Zoom");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getCalendarEvents(tokens): Promise<CalendarEvent[]> {
    const data = await getJson("Zoom meetings", "https://api.zoom.us/v2/users/me/meetings?type=upcoming&page_size=30", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    return ((data.meetings ?? []) as Record<string, any>[])
      .filter((m) => m.start_time)
      .map((m) => {
        const start = new Date(m.start_time);
        return {
          id: String(m.id),
          title: m.topic || "Zoom meeting",
          start: start.toISOString(),
          end: new Date(start.getTime() + (Number(m.duration) || 30) * 60_000).toISOString(),
          location: m.join_url,
        };
      });
  },
};
