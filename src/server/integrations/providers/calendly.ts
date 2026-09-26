/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { CalendarEvent } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://api.calendly.com";
const h = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Meetings people have booked with you on Calendly appear on your calendar. */
export const calendlyProvider = tokenOnlyProvider({
  id: "calendly",
  label: "Calendly",
  capabilities: ["calendar", "meetings"],
  tokenConnect: {
    label: "Calendly personal access token",
    placeholder: "eyJ...",
    helpUrl: "https://calendly.com/integrations/api_webhooks",
    steps: [
      "Open the link below and, under Personal access tokens, click Generate new token.",
      "Name it STACK and copy the token (shown once).",
      "Paste it here. STACK reads your upcoming booked meetings.",
    ],
    async validate(token) {
      const me = await getJson("Calendly token check", `${API}/users/me`, { headers: h(token) });
      return { account: me.resource?.email ?? me.resource?.name };
    },
  },
  async getCalendarEvents(tokens): Promise<CalendarEvent[]> {
    const headers = h(tokens.accessToken);
    const me = await getJson("Calendly user", `${API}/users/me`, { headers });
    const now = new Date();
    const until = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const url = `${API}/scheduled_events?user=${encodeURIComponent(me.resource.uri)}&status=active&min_start_time=${now.toISOString()}&max_start_time=${until.toISOString()}&count=25&sort=start_time:asc`;
    const data = await getJson("Calendly events", url, { headers });
    return ((data.collection ?? []) as Record<string, any>[]).map((e) => ({
      id: String(e.uri).split("/").pop() as string,
      title: e.name ?? "Calendly meeting",
      start: e.start_time,
      end: e.end_time,
      location: e.location?.join_url ?? e.location?.location ?? undefined,
    }));
  },
});
