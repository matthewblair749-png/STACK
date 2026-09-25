/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import { createHmac, timingSafeEqual } from "crypto";
import type { IntegrationProvider, MailMessage } from "../provider";
import { envPair, getJson } from "../oauth-util";

const env = envPair("SHOPIFY");
const SCOPES = ["read_orders", "read_customers", "read_products"];
const API_VERSION = "2025-10";

/** Accepts "my-store", "my-store.myshopify.com" or a pasted URL; rejects anything that isn't a Shopify store domain. */
function normalizeShop(input: string): string {
  const host = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const shop = host.includes(".") ? host : `${host}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) throw new Error("Enter your store's .myshopify.com address, e.g. my-store.myshopify.com.");
  return shop;
}

/** Shopify signs its redirect; refusing an unsigned one stops someone forging a callback. */
function verifyHmac(query: URLSearchParams) {
  const given = query.get("hmac") ?? "";
  const message = [...query.entries()].filter(([k]) => k !== "hmac").sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&");
  const expected = createHmac("sha256", env.secret()).update(message).digest("hex");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Shopify's response couldn't be verified. Try connecting again.");
}

/** Recent Shopify orders become messages; unpaid ones are flagged so they surface in priorities. */
export const shopifyProvider: IntegrationProvider = {
  id: "shopify",
  label: "Shopify",
  capabilities: ["messages", "search"],
  isConfigured: env.isConfigured,
  missingSetup: env.missing,
  connectFields: [{ name: "shop", label: "Store address", placeholder: "my-store.myshopify.com", help: "Your Shopify admin address." }],
  tokenConnect: {
    label: "Admin API access token",
    placeholder: "shpat_...",
    helpUrl: "https://admin.shopify.com/settings/apps/development",
    steps: [
      "In your Shopify admin open Settings > Apps and sales channels > Develop apps, and click Create an app named STACK.",
      "Click Configure Admin API scopes and tick read_orders, read_customers and read_products only. Save.",
      "Click Install app, then Reveal token once. Copy the token (starts with shpat_) and paste it below with your store address.",
    ],
    fields: [{ name: "shop", label: "Store address", placeholder: "my-store.myshopify.com", help: "Your .myshopify.com address." }],
    async validate(token, fields) {
      const shop = normalizeShop(fields.shop ?? "");
      const data = await getJson("Shopify token check", `https://${shop}/admin/api/${API_VERSION}/shop.json`, { headers: { "X-Shopify-Access-Token": token } });
      return { account: data.shop?.name ?? shop, metadata: { shop } };
    },
  },

  getAuthUrl(state, redirectUri, opts) {
    env.require("Shopify");
    const shop = normalizeShop(opts?.fields?.shop ?? "");
    const url = new URL(`https://${shop}/admin/oauth/authorize`);
    url.searchParams.set("client_id", env.id());
    url.searchParams.set("scope", SCOPES.join(","));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(code, _redirectUri, ctx) {
    env.require("Shopify");
    if (!ctx) throw new Error("Shopify sign-in context missing.");
    verifyHmac(ctx.query);
    const shop = normalizeShop(ctx.query.get("shop") ?? "");
    if (ctx.fields.shop && normalizeShop(ctx.fields.shop) !== shop) throw new Error("Shopify returned a different store than you chose.");
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: env.id(), client_secret: env.secret(), code }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Shopify token request failed: ${res.status} ${text.slice(0, 200)}`);
    const data = JSON.parse(text);
    return { accessToken: data.access_token, scopes: String(data.scope ?? SCOPES.join(",")).split(","), metadata: { shop } };
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const shop = tokens.metadata?.shop;
    if (typeof shop !== "string") throw new Error("Shopify failed: 401 store not recorded. Reconnect Shopify.");
    const data = await getJson("Shopify orders", `https://${shop}/admin/api/${API_VERSION}/orders.json?status=any&limit=30`, {
      headers: { "X-Shopify-Access-Token": tokens.accessToken, Accept: "application/json" },
    });
    return ((data.orders ?? []) as Record<string, any>[]).map((o) => {
      const customer = [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(" ") || o.email || "Customer";
      return {
        id: String(o.id),
        subject: `Order ${o.name} - ${o.currency} ${o.total_price}`,
        from: customer,
        snippet: `${o.financial_status ?? "unknown"} - ${o.fulfillment_status ?? "unfulfilled"}`,
        receivedAt: o.updated_at ?? o.created_at,
        isUnread: (o.fulfillment_status ?? "unfulfilled") === "unfulfilled" && o.financial_status === "paid",
        permalink: `https://${shop}/admin/orders/${o.id}`,
      };
    });
  },
};
