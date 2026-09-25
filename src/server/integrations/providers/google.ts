import type { CalendarEvent, ConnectedTokens, IntegrationProvider, MailMessage, ProviderFile } from "../provider";
import { ProviderNotConfiguredError } from "../provider";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

// Sending email / scheduling meetings needs extra, stricter permissions. They are requested
// separately (connect?write=1), only when the user actually wants those actions.
const WRITE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
];

function envVars() {
  return ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
}

function isConfigured() {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

function requireConfigured() {
  if (!isConfigured()) {
    throw new ProviderNotConfiguredError("Google", [`set ${envVars().join(" and ")}`]);
  }
}

export const googleProvider: IntegrationProvider = {
  id: "google",
  label: "Google",
  capabilities: ["calendar", "mail", "files"],
  isConfigured,
  missingSetup: () => (isConfigured() ? [] : [`set ${envVars().join(" and ")}`]),

  getAuthUrl(state, redirectUri, opts) {
    requireConfigured();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", (opts?.write ? [...SCOPES, ...WRITE_SCOPES] : SCOPES).join(" "));
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(code, redirectUri): Promise<ConnectedTokens> {
    requireConfigured();
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google token exchange failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: typeof data.scope === "string" ? data.scope.split(" ") : SCOPES,
    };
  },

  async refreshAccessToken(refreshToken): Promise<ConnectedTokens> {
    requireConfigured();
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google token refresh failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: typeof data.scope === "string" ? data.scope.split(" ") : SCOPES,
    };
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}` };
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=INBOX",
      { headers }
    );
    if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status} ${await listRes.text()}`);
    const listData = await listRes.json();
    const ids: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id);

    const messages = await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
          { headers }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const headerList: { name: string; value: string }[] = data.payload?.headers ?? [];
        const getHeader = (name: string) => headerList.find((h) => h.name === name)?.value ?? "";
        const fromRaw = getHeader("From");
        const fromMatch = fromRaw.match(/<([^>]+)>/);
        const isUnread = (data.labelIds ?? []).includes("UNREAD");
        const msg: MailMessage = {
          id: data.id,
          threadId: data.threadId,
          subject: getHeader("Subject") || "(no subject)",
          from: fromRaw.replace(/<[^>]+>/, "").trim() || fromRaw,
          fromAddress: fromMatch ? fromMatch[1] : fromRaw,
          snippet: data.snippet ?? "",
          receivedAt: new Date(Number(data.internalDate)).toISOString(),
          isUnread,
          permalink: `https://mail.google.com/mail/u/0/#inbox/${data.id}`,
        };
        return msg;
      })
    );
    return messages.filter((m): m is MailMessage => m !== null);
  },

  async getCalendarEvents(tokens): Promise<CalendarEvent[]> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}` };
    const timeMin = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=20&singleEvents=true&orderBy=startTime`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Google Calendar list failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return (data.items ?? []).map((e: Record<string, unknown>) => {
      const start = e.start as { dateTime?: string; date?: string };
      const end = e.end as { dateTime?: string; date?: string };
      const attendees = (e.attendees as { email?: string }[] | undefined) ?? [];
      return {
        id: e.id as string,
        title: (e.summary as string) || "(no title)",
        start: start.dateTime ?? start.date ?? new Date().toISOString(),
        end: end.dateTime ?? end.date ?? new Date().toISOString(),
        location: e.location as string | undefined,
        organizer: (e.organizer as { email?: string } | undefined)?.email,
        attendees: attendees.map((a) => a.email).filter((a): a is string => !!a),
      } satisfies CalendarEvent;
    });
  },

  async getFiles(tokens): Promise<ProviderFile[]> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}` };
    const url =
      "https://www.googleapis.com/drive/v3/files?pageSize=20&orderBy=modifiedTime desc&fields=files(id,name,webViewLink,modifiedTime,mimeType,owners)";
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Google Drive list failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return (data.files ?? []).map((f: Record<string, unknown>) => {
      const owners = (f.owners as { displayName?: string }[] | undefined) ?? [];
      return {
        id: f.id as string,
        name: f.name as string,
        url: (f.webViewLink as string) ?? "",
        modifiedAt: f.modifiedTime as string,
        mimeType: f.mimeType as string | undefined,
        ownerName: owners[0]?.displayName,
      } satisfies ProviderFile;
    });
  },
};
