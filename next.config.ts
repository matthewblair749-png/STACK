import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Error monitoring (optional) reports straight to Sentry's ingest hosts from the browser.
const sentryConnect = process.env.NEXT_PUBLIC_SENTRY_DSN ? " https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io" : "";

/**
 * Content Security Policy without nonces (Next's documented static-friendly setup): scripts and styles
 * only from this site, nothing from other origins, and no framing by other sites. 'unsafe-inline' is needed
 * for Next's inline bootstrap scripts and inline styles; 'unsafe-eval' only in development.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self'",
  `connect-src 'self'${sentryConnect}`,
  "media-src 'self' blob: mediastream:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Calls need the camera, microphone and screen sharing on STACK's own pages; nothing else gets them.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
