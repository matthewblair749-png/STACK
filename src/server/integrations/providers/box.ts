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
    // /2.0/search requires a non-empty `query` and rejects a plain listing request, so recently
    // touched files are read from /2.0/recent_items instead - the endpoint Box has for this.
    const data = await getJson("Box files", "https://api.box.com/2.0/recent_items?limit=50&fields=id,name,modified_at,modified_by", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    return ((data.entries ?? []) as Record<string, any>[])
      .filter((e) => e.item?.type === "file")
      .slice(0, 30)
      .map((e) => ({
        id: String(e.item.id),
        name: e.item.name,
        url: `https://app.box.com/file/${e.item.id}`,
        modifiedAt: e.item.modified_at ?? e.interaction_at,
        ownerName: e.item.modified_by?.name,
      }));
  },
};
