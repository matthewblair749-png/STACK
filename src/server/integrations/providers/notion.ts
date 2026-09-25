/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, ProviderFile } from "../provider";
import { basicAuth, envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("NOTION");
const VERSION = "2022-06-28";

function titleOf(item: Record<string, any>): string {
  if (Array.isArray(item.title)) return item.title.map((t: any) => t.plain_text).join("") || "Untitled";
  const prop = Object.values(item.properties ?? {}).find((p: any) => p?.type === "title") as any;
  return prop?.title?.map((t: any) => t.plain_text).join("") || "Untitled";
}

/** Notion pages and databases the user shared with STACK show up as Files. */
export const notionProvider: IntegrationProvider = {
  id: "notion",
  label: "Notion",
  capabilities: ["files", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,

  getAuthUrl(state, redirectUri) {
    env.require("Notion");
    const url = new URL("https://api.notion.com/v1/oauth/authorize");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("owner", "user");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(code, redirectUri) {
    env.require("Notion");
    return tokenRequest(
      "Notion",
      "https://api.notion.com/v1/oauth/token",
      { json: true, headers: { Authorization: basicAuth(env.id(), env.secret()) }, body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }) },
      { scopes: ["read_content"] },
    );
  },

  async getFiles(tokens): Promise<ProviderFile[]> {
    const data = await getJson("Notion search", "https://api.notion.com/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.accessToken}`, "Notion-Version": VERSION, "Content-Type": "application/json" },
      body: JSON.stringify({ sort: { direction: "descending", timestamp: "last_edited_time" }, page_size: 30 }),
    });
    return ((data.results ?? []) as Record<string, any>[]).map((p) => ({
      id: p.id,
      name: titleOf(p),
      url: p.url,
      modifiedAt: p.last_edited_time,
      mimeType: p.object === "database" ? "notion/database" : "notion/page",
    }));
  },
};
