/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { ProviderFile } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

// Smartsheet.com accounts. (Smartsheet Gov and Smartsheet Regions Europe use separate tokens and hosts.)
const API = "https://api.smartsheet.com/2.0";
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

/** Your sheets, most recently changed first, as files that open in Smartsheet. */
export const smartsheetProvider = tokenOnlyProvider({
  id: "smartsheet",
  label: "Smartsheet",
  capabilities: ["files"],
  tokenConnect: {
    label: "Smartsheet API access token",
    placeholder: "Your Smartsheet token",
    helpUrl: "https://help.smartsheet.com/articles/2482389-generate-API-key",
    steps: [
      "In Smartsheet, click your Account (profile image, bottom left) > Personal Settings > API Access.",
      "Click Generate new access token and name it STACK. (Business and Enterprise plans.)",
      "Copy the token right away - it's only shown once - and paste it here.",
    ],
    async validate(token) {
      const me = await getJson("Smartsheet token check", `${API}/users/me`, auth(token));
      return { account: me.email ?? [me.firstName, me.lastName].filter(Boolean).join(" ") };
    },
  },
  async getFiles(tokens): Promise<ProviderFile[]> {
    const data = await getJson("Smartsheet sheets", `${API}/sheets?pageSize=100`, auth(tokens.accessToken));
    return ((data.data ?? []) as Record<string, any>[])
      .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt))
      .slice(0, 50)
      .map((s) => ({ id: String(s.id), name: s.name, url: s.permalink ?? "", modifiedAt: s.modifiedAt, mimeType: "Smartsheet sheet" }));
  },
});
