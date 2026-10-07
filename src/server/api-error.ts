import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { UnauthorizedError, ForbiddenError } from "./workspace";

/** An expected failure whose message is safe to show the person (bad input, not allowed, gone). */
export class ApiError extends Error {
  constructor(public status: 400 | 403 | 404 | 409 | 410, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(err: unknown, context: string) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(context, err);
  // Unexpected failures only (not 4xx); a no-op unless error monitoring is configured.
  Sentry.captureException(err, { tags: { context } });
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
