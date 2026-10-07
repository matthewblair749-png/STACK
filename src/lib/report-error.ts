import * as Sentry from "@sentry/nextjs";

/**
 * Sends an error to monitoring when it's set up (NEXT_PUBLIC_SENTRY_DSN), and to the console either way.
 * Without a DSN, Sentry's client is never initialized and captureException is a no-op.
 */
export function reportError(error: unknown) {
  console.error(error);
  Sentry.captureException(error);
}
