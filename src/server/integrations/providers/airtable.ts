/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { ProviderFile } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://api.airtable.com/v0";
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

/** The Airtable bases you can open, as files that link straight to the base. */
export const airtableProvider = tokenOnlyProvider({
  id: "airtable",
  label: "Airtable",
  capabilities: ["files"],
  tokenConnect: {
    label: "Airtable personal access token",
    placeholder: "pat...",
    helpUrl: "https://airtable.com/create/tokens",
    steps: [
      "Open the link below and click Create token. Name it STACK.",
      "Under Scopes add schema.bases:read. Under Access, add the workspaces or bases STACK should see (or All current and future bases).",
      "Click Create token, copy it (it starts with pat) and paste it here.",
    ],
    async validate(token) {
      // whoami needs no scopes; the base list proves the token can actually read something.
      const me = await getJson("Airtable token check", `${API}/meta/whoami`, auth(token));
      const noBases = "That token works but can't list bases. Add the schema.bases:read scope and give it access to your bases.";
      // Airtable answers 403 when the scope or base access is missing - say what to fix instead of "rejected".
      const bases = await getJson("Airtable bases", `${API}/meta/bases`, auth(token)).catch(() => {
        throw new Error(noBases);
      });
      if (!Array.isArray(bases.bases)) throw new Error(noBases);
      // Airtable doesn't say when a base last changed, so bases are dated from when they were connected.
      return { account: me.email ?? me.id, metadata: { connectedAt: new Date().toISOString() } };
    },
  },
  async getFiles(tokens): Promise<ProviderFile[]> {
    const data = await getJson("Airtable bases", `${API}/meta/bases`, auth(tokens.accessToken));
    const since = typeof tokens.metadata?.connectedAt === "string" ? tokens.metadata.connectedAt : new Date().toISOString();
    return ((data.bases ?? []) as Record<string, any>[])
      .filter((b) => b.permissionLevel !== "none")
      .slice(0, 100)
      .map((b) => ({ id: b.id, name: b.name, url: `https://airtable.com/${b.id}`, modifiedAt: since, mimeType: "Airtable base" }));
  },
});
