/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { ProviderFile } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://api.typeform.com";
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

/** Your forms, most recently updated first. */
export const typeformProvider = tokenOnlyProvider({
  id: "typeform",
  label: "Typeform",
  capabilities: ["files"],
  tokenConnect: {
    label: "Typeform personal access token",
    placeholder: "tfp_...",
    helpUrl: "https://admin.typeform.com/user/tokens",
    steps: [
      "Open the link below (Your settings > Personal tokens) and click Generate a new token. Name it STACK.",
      "Give it the Forms: Read scope (and Accounts: Read so STACK can show which account is connected).",
      "Copy the token and paste it here.",
    ],
    async validate(token) {
      const me = await getJson("Typeform token check", `${API}/me`, auth(token));
      return { account: me.email ?? me.alias };
    },
  },
  async getFiles(tokens): Promise<ProviderFile[]> {
    const data = await getJson("Typeform forms", `${API}/forms?page_size=50&sort_by=last_updated_at&order_by=desc`, auth(tokens.accessToken));
    return ((data.items ?? []) as Record<string, any>[]).map((f) => ({
      id: f.id,
      name: f.title || "(untitled form)",
      url: f._links?.display ?? "",
      modifiedAt: f.last_updated_at,
      mimeType: "Typeform form",
    }));
  },
});
