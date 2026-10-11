import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { buildContextGraph } from "@/server/sync/context-graph";
import { invalidateWorkState } from "@/server/work/state";
import { audit } from "@/server/audit";

/**
 * Deletes everything STACK has synced from one app for the signed-in person, while keeping the connection. Only
 * STACK's copies are removed - nothing in the app itself. Sync positions are kept, so later syncs add new activity
 * from now on instead of re-importing what was just deleted (calendar re-reads its upcoming window each sync).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const userId = session.user.id;
    const where = { workspaceId, userId, provider };

    const [messages, events, files, tasks] = await db.$transaction([
      db.syncedMessage.deleteMany({ where }),
      db.syncedEvent.deleteMany({ where }),
      db.syncedFile.deleteMany({ where }),
      db.syncedTask.deleteMany({ where }),
    ]);
    const removed = { messages: messages.count, events: events.count, files: files.count, tasks: tasks.count };

    // Links and insights pointed at the deleted content; rebuild so nothing dangles.
    await buildContextGraph(workspaceId).catch((e) => console.error("graph rebuild after data deletion failed", e));
    invalidateWorkState(workspaceId, userId);
    await audit({ workspaceId, userId, action: "integration.data_deleted", target: provider, detail: { removed } });

    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    return handleApiError(err, "DELETE /api/integrations/[provider]/data failed");
  }
}
