/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { IntegrationProvider, MailMessage } from "../provider";
import { basicAuth, getJson, tokenRequest } from "../oauth-util";

const clientId = () => process.env.STRIPE_CONNECT_CLIENT_ID ?? "";
const secretKey = () => process.env.STRIPE_SECRET_KEY ?? "";
const isConfigured = () => !!clientId() && !!secretKey();
const missing = () => [!clientId() && "set STRIPE_CONNECT_CLIENT_ID (Stripe Connect client id, starts with ca_)", !secretKey() && "set STRIPE_SECRET_KEY (your platform's secret key)"].filter((m): m is string => !!m);

const money = (amount: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);

const tokenCall = (params: Record<string, string>, refreshToken?: string) =>
  tokenRequest(
    "Stripe",
    "https://api.stripe.com/v1/oauth/token",
    { headers: { Authorization: basicAuth(secretKey(), "") }, body: new URLSearchParams(params).toString() },
    { refreshToken, scopes: ["read_only"] },
  );

/** Recent Stripe payments become messages; failed ones are flagged unread so they surface in priorities. */
export const stripeProvider: IntegrationProvider = {
  id: "stripe",
  label: "Stripe",
  capabilities: ["messages", "search"],
  isConfigured,
  missingSetup: missing,
  tokenConnect: {
    label: "Stripe restricted API key",
    placeholder: "rk_live_...",
    helpUrl: "https://dashboard.stripe.com/apikeys",
    steps: [
      "Open the link below and click Create restricted key.",
      "Name it STACK and set Charges to Read. Leave everything else set to None.",
      "Click Create key, copy it (starts with rk_, shown once), and paste it here.",
    ],
    async validate(token) {
      await getJson("Stripe key check", "https://api.stripe.com/v1/charges?limit=1", { headers: { Authorization: `Bearer ${token}` } });
      return { account: token.startsWith("rk_test") || token.startsWith("sk_test") ? "Stripe (test mode)" : "Stripe" };
    },
  },

  getAuthUrl(state, redirectUri) {
    if (!isConfigured()) throw new Error(`Stripe: ${missing().join("; ")}.`);
    const url = new URL("https://connect.stripe.com/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId());
    url.searchParams.set("scope", "read_only");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(code) {
    if (!isConfigured()) throw new Error(`Stripe: ${missing().join("; ")}.`);
    const tokens = await tokenCall({ grant_type: "authorization_code", code });
    return tokens;
  },

  refreshAccessToken(refreshToken) {
    return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken);
  },

  async getMessages(tokens): Promise<MailMessage[]> {
    const data = await getJson("Stripe payments", "https://api.stripe.com/v1/charges?limit=30", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    return ((data.data ?? []) as Record<string, any>[]).map((c) => {
      const failed = c.status === "failed";
      const who = c.billing_details?.name || c.billing_details?.email || "a customer";
      return {
        id: String(c.id),
        subject: failed ? `Failed payment of ${money(c.amount, c.currency)}` : `${money(c.amount, c.currency)} ${c.refunded ? "refunded" : "payment"} from ${who}`,
        from: who,
        snippet: failed ? (c.failure_message ?? "Payment failed") : (c.description ?? `Payment ${c.status}`),
        receivedAt: new Date(c.created * 1000).toISOString(),
        isUnread: failed,
        permalink: c.receipt_url ?? `https://dashboard.stripe.com/payments/${c.payment_intent ?? c.id}`,
      };
    });
  },
};
