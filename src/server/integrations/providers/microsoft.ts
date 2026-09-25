import type { CalendarEvent, ConnectedTokens, IntegrationProvider, MailMessage, ProviderFile } from "../provider";
import { ProviderNotConfiguredError } from "../provider";

const SCOPES = ["offline_access", "User.Read", "Mail.Read", "Calendars.Read", "Files.Read"].join(" ");

function tenant() {
  return process.env.MICROSOFT_TENANT_ID || "common";
}

function envVars() {
  return ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"];
}

function isConfigured() {
  return !!process.env.MICROSOFT_CLIENT_ID && !!process.env.MICROSOFT_CLIENT_SECRET;
}

function requireConfigured() {
  if (!isConfigured()) {
    throw new ProviderNotConfiguredError("Microsoft", [`set ${envVars().join(" and ")}`]);
  }
}

async function tokenRequest(body: URLSearchParams) {
  const res = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Microsoft token request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export const microsoftProvider: IntegrationProvider = {
  id: "microsoft",
  label: "Microsoft",
  capabilities: ["calendar", "mail", "files"],
  isConfigured,
  missingSetup: () => (isConfigured() ? [] : [`set ${envVars().join(" and ")}`]),

  getAuthUrl(state, redirectUri) {
    requireConfigured();
    const url = new URL(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/authorize`);
    url.searchParams.set("client_id", process.env.MICROSOFT_CLIENT_ID!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(code, redirectUri): Promise<ConnectedTokens> {
    requireConfigured();
    const data = await tokenRequest(
      new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: SCOPES,
      })
    );
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: typeof data.scope === "string" ? data.scope.split(" ") : SCOPES.split(" "),
    };
  },

  async refreshAccessToken(refreshToken): Promise<ConnectedTokens> {
    requireConfigured();
    const data = await tokenRequest(
      new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        grant_type: "refresh_token",
        scope: SCOPES,
      })
    );
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: typeof data.scope === "string" ? data.scope.split(" ") : SCOPES.split(" "),
    };
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}` };
    const url =
      "https://graph.microsoft.com/v1.0/me/messages?$top=25&$select=id,subject,from,bodyPreview,receivedDateTime,isRead,webLink&$orderby=receivedDateTime desc";
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Microsoft Graph messages failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return (data.value ?? []).map((m: Record<string, unknown>) => {
      const from = m.from as { emailAddress?: { name?: string; address?: string } } | undefined;
      return {
        id: m.id as string,
        subject: (m.subject as string) || "(no subject)",
        from: from?.emailAddress?.name ?? from?.emailAddress?.address ?? "unknown",
        fromAddress: from?.emailAddress?.address,
        snippet: (m.bodyPreview as string) ?? "",
        receivedAt: m.receivedDateTime as string,
        isUnread: m.isRead === false,
        permalink: m.webLink as string | undefined,
      } satisfies MailMessage;
    });
  },

  async getCalendarEvents(tokens): Promise<CalendarEvent[]> {
    const headers = {
      Authorization: `Bearer ${tokens.accessToken}`,
      // Without this, start/end.dateTime come back in the mailbox's local
      // timezone with no offset suffix, which silently corrupts Date parsing.
      Prefer: 'outlook.timezone="UTC"',
    };
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const url =
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${in14Days.toISOString()}` +
      "&$select=id,subject,start,end,location,organizer,attendees,webLink&$orderby=start/dateTime&$top=25";
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Microsoft Graph calendar failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return (data.value ?? []).map((e: Record<string, unknown>) => {
      const start = e.start as { dateTime?: string };
      const end = e.end as { dateTime?: string };
      const location = e.location as { displayName?: string } | undefined;
      const organizer = e.organizer as { emailAddress?: { address?: string } } | undefined;
      const attendees = (e.attendees as { emailAddress?: { address?: string } }[] | undefined) ?? [];
      return {
        id: e.id as string,
        title: (e.subject as string) || "(no title)",
        start: start.dateTime ? `${start.dateTime}Z` : now.toISOString(),
        end: end.dateTime ? `${end.dateTime}Z` : now.toISOString(),
        location: location?.displayName,
        organizer: organizer?.emailAddress?.address,
        attendees: attendees.map((a) => a.emailAddress?.address).filter((a): a is string => !!a),
      } satisfies CalendarEvent;
    });
  },

  async getFiles(tokens): Promise<ProviderFile[]> {
    const headers = { Authorization: `Bearer ${tokens.accessToken}` };
    const url =
      "https://graph.microsoft.com/v1.0/me/drive/root/children?$top=25&$select=id,name,webUrl,lastModifiedDateTime,file,lastModifiedBy";
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Microsoft Graph files failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return (data.value ?? []).map((f: Record<string, unknown>) => {
      const file = f.file as { mimeType?: string } | undefined;
      const lastModifiedBy = f.lastModifiedBy as { user?: { displayName?: string } } | undefined;
      return {
        id: f.id as string,
        name: f.name as string,
        url: (f.webUrl as string) ?? "",
        modifiedAt: f.lastModifiedDateTime as string,
        mimeType: file?.mimeType,
        ownerName: lastModifiedBy?.user?.displayName,
      } satisfies ProviderFile;
    });
  },
};
