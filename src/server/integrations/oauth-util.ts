/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { ConnectedTokens } from "./provider";
import { ProviderNotConfiguredError } from "./provider";

/** Shared plumbing for the standard OAuth2 authorization-code providers. */
export function envPair(prefix: string) {
  const idVar = `${prefix}_CLIENT_ID`;
  const secretVar = `${prefix}_CLIENT_SECRET`;
  return {
    id: () => process.env[idVar] ?? "",
    secret: () => process.env[secretVar] ?? "",
    isConfigured: () => !!process.env[idVar] && !!process.env[secretVar],
    missing: () => (process.env[idVar] && process.env[secretVar] ? [] : [`set ${idVar} and ${secretVar}`]),
    require(label: string) {
      if (!process.env[idVar] || !process.env[secretVar]) throw new ProviderNotConfiguredError(label, [`set ${idVar} and ${secretVar}`]);
    },
  };
}

export function basicAuth(id: string, secret: string) {
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

/** Posts to a token endpoint and normalises the response. Errors keep the HTTP status so refresh can classify them. */
export async function tokenRequest(
  label: string,
  url: string,
  init: { body: string; headers?: Record<string, string>; json?: boolean },
  fallback: { refreshToken?: string; scopes: string[] },
): Promise<ConnectedTokens> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": init.json ? "application/json" : "application/x-www-form-urlencoded", Accept: "application/json", ...init.headers },
    body: init.body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${label} token request failed: ${res.status} ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  if (data.error) throw new Error(`${label} token request failed: 400 ${data.error_description ?? data.error}`);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? fallback.refreshToken,
    expiresAt: data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000) : undefined,
    scopes: typeof data.scope === "string" && data.scope ? data.scope.split(/[ ,]/) : fallback.scopes,
  };
}

export async function getJson(label: string, url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${label} failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
