/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { ProviderFile } from "../provider";
import { getJson } from "../oauth-util";
import { ProviderHttpError, fetchJson } from "../http";
import { cleanHost, tokenOnlyProvider } from "./token-only";

const basic = (email: string, token: string) => `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
const site = (input: string) => cleanHost(input, ".atlassian.net", "your-team.atlassian.net");

/** Recently edited Confluence pages, as files that open in Confluence. */
export const confluenceProvider = tokenOnlyProvider({
  id: "confluence",
  label: "Confluence",
  capabilities: ["files", "search"],
  tokenConnect: {
    label: "Atlassian API token",
    placeholder: "Your Atlassian API token",
    helpUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    steps: [
      "Open the link below and click Create API token. Name it STACK. (The same token type Jira uses.)",
      "Copy the token.",
      "Paste it here with your Confluence address and the email you sign in to Atlassian with.",
    ],
    fields: [
      { name: "site", label: "Confluence address", placeholder: "your-team.atlassian.net" },
      { name: "email", label: "Your Atlassian email", placeholder: "you@company.com" },
    ],
    async validate(token, fields) {
      const host = site(fields.site ?? "");
      const email = (fields.email ?? "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter the email you use to sign in to Atlassian.");
      const me = await getJson("Confluence token check", `https://${host}/wiki/rest/api/user/current`, { headers: { Authorization: basic(email, token), Accept: "application/json" } });
      return { account: me.email ?? me.displayName ?? email, metadata: { site: host, email } };
    },
  },
  async getFiles(tokens): Promise<ProviderFile[]> {
    const host = typeof tokens.metadata?.site === "string" ? site(tokens.metadata.site) : null;
    const email = tokens.metadata?.email;
    if (!host || typeof email !== "string") throw new Error("Confluence connection is missing its site or email. Reconnect Confluence.");
    const init = { headers: { Authorization: basic(email, tokens.accessToken), Accept: "application/json" } };
    const base = `https://${host}/wiki/api/v2/pages?limit=50&status=current`;
    let data: Record<string, any>;
    try {
      data = await fetchJson("Confluence pages", `${base}&sort=-modified-date`, init);
    } catch (err) {
      // If this sort isn't accepted, read without it and sort here instead.
      if (!(err instanceof ProviderHttpError && err.status === 400)) throw err;
      data = await fetchJson("Confluence pages", base, init);
    }
    const root = data._links?.base ?? `https://${host}/wiki`;
    return ((data.results ?? []) as Record<string, any>[])
      .map((p) => ({ id: String(p.id), name: p.title || "(untitled page)", url: p._links?.webui ? `${root}${p._links.webui}` : root, modifiedAt: p.version?.createdAt ?? p.createdAt, mimeType: "Confluence page" }))
      .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
  },
});
