/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { ProviderFile } from "../provider";
import { getJson } from "../oauth-util";
import { cleanHost, tokenOnlyProvider } from "./token-only";

// Each Qualtrics account lives in a data center (iad1, fra1, ca1...), which is part of its API address.
const host = (input: string) => cleanHost(input, ".qualtrics.com", "iad1.qualtrics.com");
const auth = (token: string) => ({ headers: { "X-API-TOKEN": token } });

/** Your surveys, most recently changed first, as files that open in the survey builder. */
export const qualtricsProvider = tokenOnlyProvider({
  id: "qualtrics",
  label: "Qualtrics",
  capabilities: ["files"],
  tokenConnect: {
    label: "Qualtrics API token",
    placeholder: "Your Qualtrics API token",
    helpUrl: "https://www.qualtrics.com/support/integrations/api-integration/overview/",
    steps: [
      "In Qualtrics, click the user icon (top right) > Account Settings > Qualtrics IDs.",
      "In the API box, copy your token. Only click Generate Token if there's none yet - a new one stops anything using the old one.",
      "Also copy the Datacenter ID from the User box (like iad1) and paste both here. Your account needs the Access API permission.",
    ],
    fields: [{ name: "datacenter", label: "Datacenter ID", placeholder: "iad1", help: "Shown under Qualtrics IDs > User" }],
    async validate(token, fields) {
      const h = host(fields.datacenter ?? "");
      const me = await getJson("Qualtrics token check", `https://${h}/API/v3/whoami`, auth(token));
      return { account: me.result?.email ?? me.result?.userName, metadata: { host: h } };
    },
  },
  async getFiles(tokens): Promise<ProviderFile[]> {
    const h = typeof tokens.metadata?.host === "string" ? host(tokens.metadata.host) : null;
    if (!h) throw new Error("Qualtrics connection is missing its data center. Reconnect Qualtrics.");
    const data = await getJson("Qualtrics surveys", `https://${h}/API/v3/surveys`, auth(tokens.accessToken));
    return ((data.result?.elements ?? []) as Record<string, any>[])
      .map((s) => ({ id: s.id, name: s.name || "(untitled survey)", url: `https://${h}/survey-builder/${s.id}/edit`, modifiedAt: s.lastModified, mimeType: s.isActive ? "Qualtrics survey (active)" : "Qualtrics survey" }))
      .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt))
      .slice(0, 50);
  },
});
