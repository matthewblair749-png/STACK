/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, ProviderFile } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("BOX");

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Box",
    "https://api.box.com/oauth2/token",
    { body: new URLSearchParams({ ...params, client_id: env.id(), client_secret: env.secret() }).toString() },
    { refreshToken, scopes: ["root_readonly"] },
  );

export const boxProvider: IntegrationProvider = {
  id: "box",
  label: "Box",
  capabilities: ["files", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,

  getAuthUrl(state, redirectUri) {
    env.require("Box");
    const url = new URL("https://account.box.com/api/oauth2/authorize");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("Box");
    return tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refreshAccessToken(refreshToken) {
    env.require("Box");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getFiles(tokens): Promise<ProviderFile[]> {
    const data = await getJson("Box files", "https://api.box.com/2.0/search?type=file&limit=30&sort=modified_at&direction=DESC&fields=id,name,modified_at,modified_by", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    return ((data.entries ?? []) as Record<string, any>[]).map((f) => ({
      id: String(f.id),
      name: f.name,
      url: `https://app.box.com/file/${f.id}`,
      modifiedAt: f.modified_at,
      ownerName: f.modified_by?.name,
    }));
  },
};
