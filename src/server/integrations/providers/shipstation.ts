/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://ssapi.shipstation.com";

/**
 * ShipStation signs in with a key AND a secret. They are pasted together as KEY:SECRET so both are stored
 * encrypted as one token (a secret must never sit in plain database fields). That is also exactly the form
 * Basic auth wants.
 */
const auth = (pair: string) => {
  if (!/^[^:\s]{8,}:[^:\s]{8,}$/.test(pair)) throw new Error("Paste the API key, a colon, then the API secret - like KEY:SECRET.");
  return `Basic ${Buffer.from(pair).toString("base64")}`;
};

/** Orders waiting to ship in ShipStation become messages, so nothing sits unshipped. */
export const shipstationProvider = tokenOnlyProvider({
  id: "shipstation",
  label: "ShipStation",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "ShipStation API key and secret",
    placeholder: "KEY:SECRET",
    helpUrl: "https://ss.shipstation.com/#/settings/api",
    steps: [
      "Open the link below (Account > Settings > API Settings) and click Generate API Keys, or copy the existing ones.",
      "Copy the API Key and the API Secret.",
      "Paste them as one line: the key, then a colon, then the secret (like KEY:SECRET).",
    ],
    async validate(token) {
      await getJson("ShipStation key check", `${API}/stores`, { headers: { Authorization: auth(token) } });
      return { account: "ShipStation" };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson("ShipStation orders", `${API}/orders?orderStatus=awaiting_shipment&pageSize=30&sortBy=OrderDate&sortDir=DESC`, { headers: { Authorization: auth(tokens.accessToken) } });
    return ((data.orders ?? []) as Record<string, any>[]).map((o) => ({
      id: String(o.orderId),
      subject: `Order ${o.orderNumber}${o.orderTotal != null ? ` - $${Number(o.orderTotal).toLocaleString("en-US")}` : ""}`,
      from: o.shipTo?.name ?? "ShipStation",
      snippet: `Awaiting shipment${o.shipTo?.city ? ` to ${o.shipTo.city}` : ""}`,
      receivedAt: o.orderDate ?? o.createDate,
      isUnread: true,
      permalink: "https://ss.shipstation.com/#/orders",
    }));
  },
});
