import type { SyncJob } from "@prisma/client";
import { db } from "@/server/db";
import { afterSync, recordSyncResult, syncOneProvider, type ProviderSyncResult } from "./orchestrator";
import { invalidateWorkState } from "@/server/work/state";

export type SyncReason = "connect" | "schedule" | "webhook" | "manual";

export const JOB_POLICY = {
  maxAttempts: 5,
  baseDelayMs: 30_000,
  maxDelayMs: 60 * 60_000,
  /** A running job not finished by then is assumed crashed and can be picked up again. */
  lockMs: 5 * 60_000,
};

/** Exponential backoff with full jitter: 30s, 1m, 2m, 4m... capped at an hour. */
export function backoffMs(attempts: number, random = Math.random): number {
  const ceiling = Math.min(JOB_POLICY.baseDelayMs * 2 ** Math.max(attempts - 1, 0), JOB_POLICY.maxDelayMs);
  return Math.round(ceiling / 2 + (random() * ceiling) / 2);
}

/** What to do with a job after a run: finished, retry later, or give up. */
export function nextJobState(result: Pick<ProviderSyncResult, "error" | "permanent">, attempts: number, now = Date.now(), random = Math.random) {
  if (!result.error) return { status: "Succeeded" as const, finishedAt: new Date(now), lastError: null, runAfter: undefined };
  if (result.permanent || attempts >= JOB_POLICY.maxAttempts) return { status: "Failed" as const, finishedAt: new Date(now), lastError: result.error, runAfter: undefined };
  return { status: "Queued" as const, finishedAt: null, lastError: result.error, runAfter: new Date(now + backoffMs(attempts, random)) };
}

/**
 * Queues a sync for one connection. If one is already waiting, it is reused (and brought forward) instead of
 * adding a duplicate, so bursts of webhooks or clicks collapse into one run.
 */
export async function enqueueSync(workspaceId: string, userId: string, provider: string, reason: SyncReason, delayMs = 0) {
  const runAfter = new Date(Date.now() + delayMs);
  const waiting = await db.syncJob.findFirst({ where: { workspaceId, userId, provider, status: "Queued" }, select: { id: true, runAfter: true } });
  if (waiting) {
    if (waiting.runAfter > runAfter) await db.syncJob.update({ where: { id: waiting.id }, data: { runAfter } });
    return waiting.id;
  }
  const job = await db.syncJob.create({ data: { workspaceId, userId, provider, reason, runAfter }, select: { id: true } });
  return job.id;
}

/**
 * Atomically takes up to `limit` due jobs (or jobs whose worker died). SKIP LOCKED means two workers running at
 * once never take the same job.
 */
export async function claimJobs(limit: number, filter?: { workspaceId: string; userId: string }): Promise<SyncJob[]> {
  // Prisma stores DateTime as UTC in a column without a time zone, so compare against UTC explicitly - plain
  // now() would be shifted by whatever time zone the database session happens to use.
  if (filter) {
    return db.$queryRaw<SyncJob[]>`
      UPDATE "SyncJob" SET status = 'Running', "lockedUntil" = (now() AT TIME ZONE 'UTC') + ${JOB_POLICY.lockMs} * interval '1 millisecond', attempts = attempts + 1, "updatedAt" = (now() AT TIME ZONE 'UTC')
      WHERE id IN (
        SELECT id FROM "SyncJob"
        WHERE "workspaceId" = ${filter.workspaceId} AND "userId" = ${filter.userId}
          AND ((status = 'Queued' AND "runAfter" <= (now() AT TIME ZONE 'UTC')) OR (status = 'Running' AND "lockedUntil" < (now() AT TIME ZONE 'UTC')))
        ORDER BY "runAfter" LIMIT ${limit} FOR UPDATE SKIP LOCKED
      ) RETURNING *`;
  }
  return db.$queryRaw<SyncJob[]>`
    UPDATE "SyncJob" SET status = 'Running', "lockedUntil" = (now() AT TIME ZONE 'UTC') + ${JOB_POLICY.lockMs} * interval '1 millisecond', attempts = attempts + 1, "updatedAt" = (now() AT TIME ZONE 'UTC')
    WHERE id IN (
      SELECT id FROM "SyncJob"
      WHERE (status = 'Queued' AND "runAfter" <= (now() AT TIME ZONE 'UTC')) OR (status = 'Running' AND "lockedUntil" < (now() AT TIME ZONE 'UTC'))
      ORDER BY "runAfter" LIMIT ${limit} FOR UPDATE SKIP LOCKED
    ) RETURNING *`;
}

async function runJob(job: SyncJob): Promise<ProviderSyncResult> {
  const result = await syncOneProvider(job.workspaceId, job.userId, job.provider).catch(
    (err): ProviderSyncResult => ({ provider: job.provider, error: err instanceof Error ? err.message.slice(0, 300) : "Sync failed." }),
  );
  await recordSyncResult(job.workspaceId, job.userId, result);
  const next = nextJobState(result, job.attempts);
  await db.syncJob.update({
    where: { id: job.id },
    data: { status: next.status, lastError: next.lastError, finishedAt: next.finishedAt, lockedUntil: null, ...(next.runAfter ? { runAfter: next.runAfter } : {}) },
  });
  return result;
}

/**
 * Works through due jobs until `budgetMs` is used up, then stops - whatever is left waits for the next run.
 * Derived data (links, insights) is rebuilt once per person afterwards, not once per job.
 */
export async function processSyncJobs(opts: { budgetMs: number; batch?: number; filter?: { workspaceId: string; userId: string } }) {
  const started = Date.now();
  const touched = new Map<string, { workspaceId: string; userId: string }>();
  const results: ProviderSyncResult[] = [];
  while (Date.now() - started < opts.budgetMs) {
    const jobs = await claimJobs(opts.batch ?? 5, opts.filter);
    if (!jobs.length) break;
    results.push(...(await Promise.all(jobs.map(runJob))));
    for (const j of jobs) touched.set(`${j.workspaceId}:${j.userId}`, { workspaceId: j.workspaceId, userId: j.userId });
  }
  for (const { workspaceId, userId } of touched.values()) {
    await afterSync(workspaceId, userId).catch((e) => console.error("afterSync failed", e));
    invalidateWorkState(workspaceId, userId);
  }
  return { processed: results.length, results };
}

/** Queues a scheduled sync for every connection not synced recently - the safety net for missed webhooks. */
export async function enqueueStaleConnections(olderThanMs: number) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const stale = await db.integration.findMany({
    where: { syncError: null, OR: [{ lastSyncAttemptAt: null }, { lastSyncAttemptAt: { lt: cutoff } }] },
    select: { workspaceId: true, userId: true, provider: true },
    take: 500,
  });
  for (const s of stale) await enqueueSync(s.workspaceId, s.userId, s.provider, "schedule");
  return stale.length;
}

/** Old finished jobs and webhook records are only useful for a while; keep the tables small. */
export async function pruneSyncHistory(keepDays = 14) {
  const cutoff = new Date(Date.now() - keepDays * 86_400_000);
  await Promise.all([
    db.syncJob.deleteMany({ where: { status: { in: ["Succeeded", "Failed"] }, updatedAt: { lt: cutoff } } }),
    db.webhookDelivery.deleteMany({ where: { receivedAt: { lt: cutoff } } }),
  ]);
}
