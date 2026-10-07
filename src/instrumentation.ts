import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

/** Server and edge error monitoring. Inactive unless NEXT_PUBLIC_SENTRY_DSN is set. */
export async function register() {
  if (sentryOptions.enabled) Sentry.init(sentryOptions);
}

// Reports errors thrown while rendering or in route handlers (Next.js onRequestError hook).
export const onRequestError = Sentry.captureRequestError;
