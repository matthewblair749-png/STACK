/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { basicAuth, getJson, tokenRequest } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

// Harvest v3 (harvestdocs.greenhouse.io). v1/v2 and their API keys were switched off on 2026-08-31.
const AUTH = "https://auth.greenhouse.io/token";
const API = "https://harvest.greenhouse.io/v3";

function clientIdOf(input: string): string {
  const id = input.trim();
  if (!/^[A-Za-z0-9._~-]{8,200}$/.test(id)) throw new Error("Enter the Client ID from your Harvest V3 (OAuth) credentials in Greenhouse.");
  return id;
}

/**
 * Harvest v3 uses OAuth client credentials: the client ID and secret buy a short-lived bearer token. No `sub`,
 * so Greenhouse acts as the integration user it created with the credentials. Nothing is cached: each sync
 * mints a fresh token, so the only long-lived value stored is the secret.
 */
async function mintToken(clientId: string, secret: string): Promise<string> {
  const t = await tokenRequest("Greenhouse", AUTH, { body: "grant_type=client_credentials", headers: { Authorization: basicAuth(clientId, secret) } }, { scopes: [] });
  if (!t.accessToken) throw new Error("Greenhouse token request failed: 401 no access token returned");
  return t.accessToken;
}

function get(label: string, token: string, path: string, query: Record<string, string>) {
  return getJson(label, `${API}${path}?${new URLSearchParams(query)}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
}

/** Active applications with activity in the last 30 days become messages: candidate, job and current stage. */
export const greenhouseProvider = tokenOnlyProvider({
  id: "greenhouse",
  label: "Greenhouse",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Client Secret",
    placeholder: "Your Harvest V3 Client Secret",
    helpUrl: "https://app.greenhouse.io/configure/dev_center/credentials",
    steps: [
      "Only a Greenhouse Site Admin (or a user who can manage all of the organization's API credentials) can do this. If that isn't you, send these steps to your admin.",
      "Open the link below (Configure > Dev Center > API Credential Management) and click Create new API credentials. Choose Harvest V3 (OAuth) and name it STACK.",
      "Copy the Client ID and the Client Secret (the secret is shown once). Greenhouse creates an integration user for the credentials; leave it as is.",
      "Under Manage scopes, allow List applications, List candidates and List jobs only, and save.",
      "Paste the Client ID and the Client Secret here.",
    ],
    fields: [{ name: "clientId", label: "Client ID", placeholder: "Your Harvest V3 Client ID", help: "Shown next to the Client Secret in Greenhouse" }],
    async validate(secret, fields) {
      const clientId = clientIdOf(fields.clientId ?? "");
      const token = await mintToken(clientId, secret);
      await get("Greenhouse access check", token, "/applications", { per_page: "1", fields: "id" });
      return { account: "Greenhouse", metadata: { clientId } };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const clientId = tokens.metadata?.clientId;
    if (typeof clientId !== "string") throw new Error("Greenhouse failed: 401 client ID missing. Reconnect Greenhouse.");
    const token = await mintToken(clientId, tokens.accessToken);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    // 50 per page keeps the candidate and job lookups below within their 50-ids-per-request limit.
    const apps = ((await get("Greenhouse applications", token, "/applications", {
      status: "active",
      "last_activity_at[gte]": since,
      per_page: "50",
      fields: "id,candidate_id,job_id,stage_name,needs_decision,prospect,last_activity_at,updated_at",
    })) ?? []) as Record<string, any>[];
    if (!apps.length) return [];

    const ids = (key: string) => [...new Set(apps.map((a) => a[key]).filter((v) => typeof v === "number"))].join(",");
    const candidateIds = ids("candidate_id");
    const jobIds = ids("job_id");
    const [candidates, jobs] = await Promise.all([
      candidateIds ? get("Greenhouse candidates", token, "/candidates", { ids: candidateIds, per_page: "50", fields: "id,first_name,last_name,preferred_name" }) : [],
      jobIds ? get("Greenhouse jobs", token, "/jobs", { ids: jobIds, per_page: "50", fields: "id,name" }) : [],
    ]);
    const people = new Map(((candidates ?? []) as Record<string, any>[]).map((c) => [c.id, c]));
    const jobNames = new Map(((jobs ?? []) as Record<string, any>[]).map((j) => [j.id, j.name as string | undefined]));

    return apps
      .map((a) => {
        const c = people.get(a.candidate_id) ?? {};
        const name = `${c.preferred_name || c.first_name || ""} ${c.last_name ?? ""}`.trim();
        return {
          id: String(a.id),
          subject: name || "Candidate",
          from: jobNames.get(a.job_id) ?? (a.prospect ? "Prospect" : "Greenhouse"),
          snippet: [a.stage_name, a.needs_decision ? "needs a decision" : null].filter(Boolean).join(" - ") || "Active",
          receivedAt: new Date(a.last_activity_at ?? a.updated_at ?? Date.now()).toISOString(),
          isUnread: a.needs_decision === true,
          permalink: `https://app.greenhouse.io/people/${a.candidate_id}?application_id=${a.id}`,
        };
      })
      .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
      .slice(0, 30);
  },
});
