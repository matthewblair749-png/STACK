/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { MailMessage } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://api.goshippo.com";
const h = (token: string) => ({ Authorization: `ShippoToken ${token.trim()}` });

/** Recent Shippo orders that are not shipped yet become messages, so nothing sits unfulfilled. */
export const shippoProvider = tokenOnlyProvider({
  id: "shippo",
  label: "Shippo",
  capabilities: ["messages", "search"],
  tokenConnect: {
    label: "Shippo API token",
    placeholder: "shippo_live_...",
    helpUrl: "https://apps.goshippo.com/settings/api",
    steps: [
      "Open the link below (Settings > API) in Shippo.",
      "Click Generate Token under Live Tokens (or copy an existing one).",
      "Paste the token here. STACK only reads orders.",
    ],
    async validate(token) {
      await getJson("Shippo token check", `${API}/orders/?results=1`, { headers: h(token) });
      return { account: "Shippo" };
    },
  },
  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson("Shippo orders", `${API}/orders/?results=30`, { headers: h(tokens.accessToken) });
    return ((data.results ?? []) as Record<string, any>[])
      .filter((o) => !/SHIPPED|DELIVERED|CANCELLED/i.test(String(o.order_status ?? "")))
      .map((o) => ({
        id: String(o.object_id),
        subject: `Order ${o.order_number ?? o.object_id}${o.total_price ? ` - ${o.currency ?? "$"} ${o.total_price}` : ""}`,
        from: o.to_address?.name ?? "Shippo",
        snippet: `${o.order_status ?? "Open"}${o.to_address?.city ? ` - to ${o.to_address.city}` : ""}`,
        receivedAt: o.placed_at ?? new Date().toISOString(),
        isUnread: true,
        permalink: "https://apps.goshippo.com/orders",
      }));
  },
});
