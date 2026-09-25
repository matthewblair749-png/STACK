import { NextResponse } from "next/server";
import { UnauthorizedError, ForbiddenError } from "./workspace";

export function handleApiError(err: unknown, context: string) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  console.error(context, err);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
