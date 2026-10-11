import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { enqueueStaleConnections, processSyncJobs, pruneSyncHistory } from "@/server/sync/jobs";

export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>".
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The scheduled safety net: queues a sync for every connection that hasn't synced in a while (catching anything a
 * webhook missed), works the queue for a bounded time, and prunes old job records.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const queued = await enqueueStaleConnections(12 * 60 * 60_000);
  const { processed, results } = await processSyncJobs({ budgetMs: 45_000 });
  await pruneSyncHistory().catch((e) => console.error("prune sync history failed", e));
  return NextResponse.json({ queued, processed, failed: results.filter((r) => r.error).length });
}
