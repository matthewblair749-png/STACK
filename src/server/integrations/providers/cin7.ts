/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://inventory.dearsystems.com/ExternalApi/v2";
const h = (key: string, account: string) => ({ "api-auth-accountid": account, "api-auth-applicationkey": key.trim() });
const accountId = (v: string) => {
  const id = v.trim();
  if (!/^[0-9a-fA-F-]{16,64}$/.test(id)) throw new Error("Enter the Account ID from Cin7 Core (a long code with letters, numbers and dashes).");
  return id;
};

/** Cin7 Core sales orders that are still open become messages. */
export const cin7Provider = tokenOnlyProvider({
  id: "cin7",
  label: "Cin7",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Cin7 Core application key",
    placeholder: "Your Cin7 Core application key",
    helpUrl: "https://inventory.dearsystems.com/ExternalApi",
    steps: [
      "In Cin7 Core open Integrations > API (Settings) and create a new API connection named STACK.",
      "Copy the Account ID and the Application Key (shown once).",
      "Paste the key here with the Account ID. This works with Cin7 Core (formerly DEAR).",
    ],
    fields: [{ name: "accountId", label: "Account ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }],
    async validate(token, fields) {
      const acct = accountId(fields.accountId ?? "");
      await getJson("Cin7 key check", `${API}/me`, { headers: h(token, acct) });
      return { account: "Cin7 Core", metadata: { accountId: acct } };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const acct = tokens.metadata?.accountId;
    if (typeof acct !== "string") throw new Error("Cin7 failed: 401 account ID missing. Reconnect Cin7.");
    const data = await getJson("Cin7 sales", `${API}/saleList?Page=1&Limit=30`, { headers: h(tokens.accessToken, acct) });
    return ((data.SaleList ?? []) as Record<string, any>[])
      .filter((s) => !/COMPLETED|VOIDED|CANCELLED/i.test(String(s.Status ?? "")))
      .map((s) => ({
        id: String(s.SaleID),
        subject: `Sale ${s.OrderNumber ?? s.SaleID}`,
        from: s.Customer ?? "Cin7",
        snippet: `${s.Status ?? "Open"}${s.InvoiceAmount ? ` - ${Number(s.InvoiceAmount).toLocaleString("en-US")}` : ""}`,
        receivedAt: s.OrderDate ?? new Date().toISOString(),
        isUnread: true,
        permalink: "https://inventory.dearsystems.com/Sale",
      }));
  },
});
