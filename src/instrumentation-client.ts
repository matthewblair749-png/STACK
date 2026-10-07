import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

if (sentryOptions.enabled) Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
