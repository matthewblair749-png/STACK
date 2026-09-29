/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, ProviderFile } from "../provider";
import { envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("DROPBOX");
const SCOPES = ["files.metadata.read", "account_info.read"];

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Dropbox",
    "https://api.dropboxapi.com/oauth2/token",
    { body: new URLSearchParams({ ...params, client_id: env.id(), client_secret: env.secret() }).toString() },
    { refreshToken, scopes: SCOPES },
  );

export const dropboxProvider: IntegrationProvider = {
  id: "dropbox",
  label: "Dropbox",
  capabilities: ["files", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,
  tokenConnect: {
    label: "Dropbox generated access token",
    placeholder: "sl.•••••••••••••••••••••",
    helpUrl: "https://www.dropbox.com/developers/apps",
    steps: [
      "Open the Dropbox App Console and create an app (Scoped access, Full Dropbox, name it STACK) - or open it if you already made one.",
      "On the Permissions tab, check files.metadata.read and account_info.read, then click Submit.",
      "On the Settings tab, under OAuth 2, click Generate under Generated access token.",
      "Copy the token and paste it here.",
    ],
    async validate(token) {
      const account = await getJson("Dropbox token check", "https://api.dropboxapi.com/2/users/get_current_account", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "null",
      });
      return { account: account.email ?? account.name?.display_name };
    },
  },

  getAuthUrl(state, redirectUri) {
    env.require("Dropbox");
    const url = new URL("https://www.dropbox.com/oauth2/authorize");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("token_access_type", "offline");
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  },

  exchangeCode(code, redirectUri) {
    env.require("Dropbox");
    return tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  },

  refreshAccessToken(refreshToken) {
    env.require("Dropbox");
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getFiles(tokens): Promise<ProviderFile[]> {
    const data = await getJson("Dropbox files", "https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path: "", recursive: true, limit: 200, include_media_info: false }),
    });
    return ((data.entries ?? []) as Record<string, any>[])
      .filter((e) => e[".tag"] === "file" && e.server_modified)
      .sort((a, b) => Date.parse(b.server_modified) - Date.parse(a.server_modified))
      .slice(0, 30)
      .map((e) => ({
        id: e.id,
        name: e.name,
        url: `https://www.dropbox.com/home${encodeURI(e.path_display ?? "")}`.replace(/\/[^/]+$/, ""),
        modifiedAt: e.server_modified,
      }));
  },
};
