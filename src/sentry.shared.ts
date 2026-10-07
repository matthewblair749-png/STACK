/**
 * Error monitoring settings shared by browser, server and edge. Errors only: no performance tracing, no
 * session replay, and no personal data (no IPs, cookies or request bodies). Nothing is sent - and Sentry
 * isn't initialized at all - unless NEXT_PUBLIC_SENTRY_DSN is set.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0,
  sendDefaultPii: false,
};
