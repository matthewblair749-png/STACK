/**
 * Some providers (Zoom, Slack) refuse `http://localhost` redirect URLs. For those, set
 * OAUTH_REDIRECT_BASE_<PROVIDER>=https://your-tunnel.example (e.g. OAUTH_REDIRECT_BASE_ZOOM) and register
 * that address with the provider. The user keeps using the normal app address; only the provider's redirect
 * goes through the public address, and the callback bounces it straight back (see `relayTarget`).
 */
const override = (providerId: string) => process.env[`OAUTH_REDIRECT_BASE_${providerId.toUpperCase()}`]?.trim().replace(/\/+$/, "");

export function redirectBase(providerId: string, requestOrigin: string): string {
  return override(providerId) || requestOrigin;
}

/**
 * If this callback came in through the public address (a tunnel rewrites the Host header, so the tell is
 * Cloudflare's own request header), the app address to bounce it to - that's where the browser's cookies live.
 */
export function relayTarget(providerId: string, headers: Headers): string | null {
  const base = override(providerId);
  const home = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (!base || !home || base === home) return null;
  const viaTunnel = headers.has("cf-ray") || headers.has("cf-connecting-ip") || headers.get("x-forwarded-host") === new URL(base).host;
  return viaTunnel ? home : null;
}
