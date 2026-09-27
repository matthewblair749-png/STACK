/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { cleanHost, tokenOnlyProvider } from "./token-only";

const host = (input: string) => cleanHost(input, ".service-now.com", "your-company.service-now.com");
/** ServiceNow's REST API signs in with a username and password, pasted as USER:PASSWORD so both are stored encrypted as one token. */
const auth = (pair: string) => {
  if (!/^[^:\s]{1,100}:.{1,200}$/.test(pair)) throw new Error("Paste the username, a colon, then the password - like user:password.");
  return `Basic ${Buffer.from(pair).toString("base64")}`;
};
const h = (pair: string) => ({ Authorization: auth(pair), Accept: "application/json" });

/** Active ServiceNow incidents, most recently updated first, become messages. */
export const servicenowProvider = tokenOnlyProvider({
  id: "servicenow",
  label: "ServiceNow",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "ServiceNow username:password",
    placeholder: "username:password",
    helpUrl: "https://developer.servicenow.com/dev.do#!/reference/api/latest/rest/c_TableAPI",
    steps: [
      "Ask your ServiceNow admin (or use your own account) for a dedicated read-only user for STACK, ideally with only the itil_read-style role.",
      "Enter that user's username and password as one line: username, a colon, then the password.",
      "Paste it here with your ServiceNow address (like your-company.service-now.com).",
    ],
    fields: [{ name: "domain", label: "ServiceNow address", placeholder: "your-company.service-now.com" }],
    async validate(token, fields) {
      const site = host(fields.domain ?? "");
      await getJson("ServiceNow check", `https://${site}/api/now/table/incident?sysparm_limit=1`, { headers: h(token) });
      return { account: site, metadata: { domain: site } };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const site = tokens.metadata?.domain;
    if (typeof site !== "string") throw new Error("ServiceNow failed: 401 address missing. Reconnect ServiceNow.");
    const q = encodeURIComponent("active=true^ORDERBYDESCsys_updated_on");
    const data = await getJson("ServiceNow incidents", `https://${site}/api/now/table/incident?sysparm_query=${q}&sysparm_limit=30&sysparm_display_value=true&sysparm_fields=sys_id,number,short_description,priority,state,caller_id,sys_updated_on`, { headers: h(tokens.accessToken) });
    return ((data.result ?? []) as Record<string, any>[]).map((i) => ({
      id: String(i.sys_id),
      subject: `${i.number}: ${i.short_description || "(no description)"}`,
      from: (typeof i.caller_id === "object" ? i.caller_id?.display_value : i.caller_id) || "ServiceNow",
      snippet: [i.priority && `Priority ${i.priority}`, i.state].filter(Boolean).join(" - "),
      receivedAt: i.sys_updated_on ? new Date(`${String(i.sys_updated_on).replace(" ", "T")}Z`).toISOString() : new Date().toISOString(),
      isUnread: true,
      permalink: `https://${site}/nav_to.do?uri=incident.do?sys_id=${i.sys_id}`,
    }));
  },
});
