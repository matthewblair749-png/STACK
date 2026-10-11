import type { CalendarEvent, ConnectedTokens, IntegrationProvider, MailMessage, ProviderFile } from "../provider";
import { ProviderNotConfiguredError } from "../provider";
import { fetchJson } from "../http";
import { googleSyncIncremental, syncCalendar, syncGmail, toProviderFile } from "./google-sync";

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
  // Google supports PKCE for web-server clients alongside the client secret.
  pkce: true,

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
    if (opts?.codeChallenge) {
      url.searchParams.set("code_challenge", opts.codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
    }
    return url.toString();
  },

  async exchangeCode(code, redirectUri, ctx): Promise<ConnectedTokens> {
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
        ...(ctx?.codeVerifier ? { code_verifier: ctx.codeVerifier } : {}),
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

  // One-off reads (a quick look without a stored cursor). The sync engine uses syncIncremental below.
  async getMessages(tokens): Promise<MailMessage[]> {
    return (await syncGmail(tokens, undefined)).delta.upserts;
  },

  async getCalendarEvents(tokens): Promise<CalendarEvent[]> {
    return (await syncCalendar(tokens)).upserts;
  },

  async getFiles(tokens): Promise<ProviderFile[]> {
    const data = await fetchJson<{ files?: Record<string, unknown>[] }>(
      "Google Drive list",
      `https://www.googleapis.com/drive/v3/files?pageSize=20&orderBy=modifiedTime desc&q=trashed = false&fields=files(id,name,webViewLink,modifiedTime,mimeType,owners(displayName))`,
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
    return (data.files ?? []).map(toProviderFile);
  },

  syncIncremental: googleSyncIncremental,
};
