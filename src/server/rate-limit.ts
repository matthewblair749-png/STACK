import { NextResponse } from "next/server";
import { db } from "./db";

/**
 * Fixed-window rate limits, counted in Postgres so every serverless instance shares the same numbers and no
 * extra service is needed. One atomic statement per check: the row's window resets when it has expired,
 * otherwise its count goes up. If the database itself is unreachable the request is allowed - a limiter
 * outage must never lock everyone out - and the failure is logged.
 */
export const LIMITS = {
  /** Sign-in emails: per address and per network, so nobody can flood an inbox. */
  emailSignInPerAddress: { max: 3, windowSec: 15 * 60 },
  emailSignInPerIp: { max: 10, windowSec: 15 * 60 },
  /** AI questions (the daily cap limits cost; this stops bursts). */
  aiAsk: { max: 20, windowSec: 60 },
  /** Creating invite links, and trying invite links. */
  inviteCreate: { max: 30, windowSec: 60 * 60 },
  inviteUse: { max: 30, windowSec: 10 * 60 },
  /** Pasting a token: each attempt calls the other app's API. */
  tokenConnect: { max: 10, windowSec: 10 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

export interface LimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export async function rateLimit(name: LimitName, subject: string): Promise<LimitResult> {
  const { max, windowSec } = LIMITS[name];
  const key = `${name}:${subject.toLowerCase().slice(0, 200)}`;
  try {
    const rows = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart") VALUES (${key}, 1, NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."windowStart" < NOW() - make_interval(secs => ${windowSec}) THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimit"."windowStart" < NOW() - make_interval(secs => ${windowSec}) THEN NOW() ELSE "RateLimit"."windowStart" END
      RETURNING "count", "windowStart"`;
    const { count, windowStart } = rows[0];
    // Old rows are tiny, but don't let them pile up forever.
    if (Math.random() < 0.01) {
      db.$executeRaw`DELETE FROM "RateLimit" WHERE "windowStart" < NOW() - INTERVAL '1 day'`.catch(() => {});
    }
    const retryAfterSec = Math.max(1, Math.ceil((windowStart.getTime() + windowSec * 1000 - Date.now()) / 1000));
    return { ok: count <= max, remaining: Math.max(0, max - count), retryAfterSec };
  } catch (err) {
    console.error("rate limiter unavailable; allowing request", err instanceof Error ? err.message.slice(0, 200) : err);
    return { ok: true, remaining: max, retryAfterSec: 0 };
  }
}

/** The caller's address as Vercel reports it. Only used as a rate-limit key, never stored elsewhere. */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function tooManyRequests(result: LimitResult, message = "Too many attempts. Please wait a moment and try again.") {
  const minutes = Math.ceil(result.retryAfterSec / 60);
  return NextResponse.json(
    { error: result.retryAfterSec > 90 ? `${message.replace(/a moment/, `about ${minutes} minutes`)}` : message },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
  );
}
