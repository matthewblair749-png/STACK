/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, ProviderFile } from "../provider";
import { basicAuth, envPair, getJson, tokenRequest } from "../oauth-util";

const env = envPair("FIGMA");
const SCOPES = ["file_content:read", "projects:read"];

const tokenCall = (url: string, params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Figma",
    url,
    { headers: { Authorization: basicAuth(env.id(), env.secret()) }, body: new URLSearchParams(params).toString() },
    { refreshToken, scopes: SCOPES },
  );

/** Figma's API can't list "all my files" - it lists a team's projects - so the team is chosen at connect time. */
function teamIdFrom(input: string): string {
  const id = input.match(/team\/(\d+)/)?.[1] ?? input.trim();
  if (!/^\d+$/.test(id)) throw new Error("Paste your Figma team URL (figma.com/files/team/123.../...) or its numeric id.");
  return id;
}

/** Personal access tokens (figd_...) use their own header; OAuth tokens use Bearer. */
const figmaHeaders = (token: string): Record<string, string> => (token.startsWith("figd_") ? { "X-Figma-Token": token } : { Authorization: `Bearer ${token}` });

export const figmaProvider: IntegrationProvider = {
  id: "figma",
  label: "Figma",
  capabilities: ["files", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,
  connectFields: [{ name: "team", label: "Team URL or id", placeholder: "https://www.figma.com/files/team/1234567890/My-team", help: "Open your team in Figma and copy the address." }],
  tokenConnect: {
    label: "Figma personal access token",
    placeholder: "figd_...",
    helpUrl: "https://www.figma.com/settings",
    steps: [
      "Open Figma > Settings > Security > Personal access tokens and click Generate new token.",
      "Name it STACK and give it read access to File content and Projects. Copy the token (starts with figd_, shown once).",
      "Open your team in Figma, copy its address from the browser, and paste both below.",
    ],
    fields: [{ name: "team", label: "Team URL or id", placeholder: "https://www.figma.com/files/team/1234567890/My-team", help: "Open your team in Figma and copy the address." }],
    async validate(token, fields) {
      const teamId = teamIdFrom(fields.team ?? "");
      const data = await getJson("Figma token check", `https://api.figma.com/v1/teams/${teamId}/projects`, { headers: figmaHeaders(token) });
      return { account: data.name ?? `Team ${teamId}`, metadata: { teamId } };
    },
  },

  getAuthUrl(state, redirectUri) {
    env.require("Figma");
    const url = new URL("https://www.figma.com/oauth");
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPES.join(","));
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    return url.toString();
  },

  async exchangeCode(code, redirectUri, ctx) {
    env.require("Figma");
    const teamId = teamIdFrom(ctx?.fields.team ?? "");
    const tokens = await tokenCall("https://api.figma.com/v1/oauth/token", { redirect_uri: redirectUri, code, grant_type: "authorization_code" });
    return { ...tokens, metadata: { teamId } };
  },

  refreshAccessToken(refreshToken) {
    env.require("Figma");
    return tokenCall("https://api.figma.com/v1/oauth/refresh", { refresh_token: refreshToken }, refreshToken);
  },

  async getFiles(tokens): Promise<ProviderFile[]> {
    const teamId = tokens.metadata?.teamId;
    if (typeof teamId !== "string") throw new Error("Figma failed: 401 team not recorded. Reconnect Figma.");
    const headers = figmaHeaders(tokens.accessToken);
    const projects = await getJson("Figma projects", `https://api.figma.com/v1/teams/${teamId}/projects`, { headers });
    const perProject = await Promise.all(
      ((projects.projects ?? []) as Record<string, any>[]).slice(0, 12).map(async (p) => {
        const files = await getJson("Figma files", `https://api.figma.com/v1/projects/${p.id}/files`, { headers });
        return ((files.files ?? []) as Record<string, any>[]).map((f) => ({
          id: f.key,
          name: f.name,
          url: `https://www.figma.com/file/${f.key}`,
          modifiedAt: f.last_modified,
          ownerName: p.name,
        }));
      }),
    );
    return perProject.flat().sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt)).slice(0, 40);
  },
};
