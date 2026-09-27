/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

/** "acme", "acme.bamboohr.com" or a pasted URL -> "acme". Only a plain company name is allowed (it goes into a request path). */
function company(input: string): string {
  const name = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\.bamboohr\.com.*$/, "").replace(/[/?#].*$/, "");
  if (!/^[a-z0-9][a-z0-9-]{0,58}$/.test(name)) throw new Error("Enter your BambooHR company name, e.g. acme (from acme.bamboohr.com).");
  return name;
}
const base = (c: string) => `https://api.bamboohr.com/api/gateway.php/${c}/v1`;
const h = (key: string) => ({ Authorization: `Basic ${Buffer.from(`${key}:x`).toString("base64")}`, Accept: "application/json" });
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

/** Time-off requests waiting for approval in BambooHR become messages (visible to admins and managers). */
export const bamboohrProvider = tokenOnlyProvider({
  id: "bamboohr",
  label: "BambooHR",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "BambooHR API key",
    placeholder: "Your BambooHR API key",
    helpUrl: "https://www.bamboohr.com/",
    steps: [
      "In BambooHR click your name (bottom left) > API Keys, then Add New Key. Name it STACK.",
      "Copy the key (shown once).",
      "Paste it here with your company name (the part before .bamboohr.com).",
    ],
    fields: [{ name: "company", label: "Company name", placeholder: "acme", help: "From acme.bamboohr.com" }],
    async validate(token, fields) {
      const c = company(fields.company ?? "");
      await getJson("BambooHR key check", `${base(c)}/employees/directory`, { headers: h(token) });
      return { account: `${c}.bamboohr.com`, metadata: { company: c } };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const c = tokens.metadata?.company;
    if (typeof c !== "string") throw new Error("BambooHR failed: 401 company missing. Reconnect BambooHR.");
    const rows = await getJson("BambooHR time off", `${base(c)}/time_off/requests/?status=requested&start=${day(-30)}&end=${day(120)}`, { headers: h(tokens.accessToken) });
    return ((rows ?? []) as Record<string, any>[]).map((r) => ({
      id: String(r.id),
      subject: `${r.name ?? "Someone"}: ${r.type?.name ?? "time off"} request`,
      from: "BambooHR",
      snippet: `${r.start} to ${r.end}${r.amount?.amount ? ` (${r.amount.amount} ${r.amount.unit})` : ""} - waiting for approval`,
      receivedAt: r.created ? new Date(r.created).toISOString() : new Date().toISOString(),
      isUnread: true,
      permalink: `https://${c}.bamboohr.com/inbox/`,
    }));
  },
});
