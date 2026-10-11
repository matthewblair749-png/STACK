import { after, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { enqueueSync, processSyncJobs } from "@/server/sync/jobs";

export const maxDuration = 60;

/**
 * "Sync now": queues a sync for each of the person's connections, then works through their own queue for a
 * bounded time so the button can show results. Anything not finished in that time carries on after the
 * response, and is otherwise picked up by the next scheduled run.
 */
export async function POST() {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const userId = session.user.id;
    const connections = await db.integration.findMany({ where: { workspaceId, userId }, select: { provider: true } });
    await Promise.all(connections.map((c) => enqueueSync(workspaceId, userId, c.provider, "manual")));

    const filter = { workspaceId, userId };
    const { results } = await processSyncJobs({ budgetMs: 25_000, filter });
    after(() => processSyncJobs({ budgetMs: 25_000, filter }).catch((e) => console.error("background sync failed", e)));
    return NextResponse.json({ perProvider: results });
  } catch (err) {
    return handleApiError(err, "POST /api/integrations/sync failed");
  }
}
