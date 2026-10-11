import { db } from "@/server/db";
import { decrypt } from "@/server/crypto";
import { revokeConnection, type RevokeResult } from "./revoke";
import { buildContextGraph } from "@/server/sync/context-graph";
import { invalidateWorkState } from "@/server/work/state";

export interface DisconnectResult {
  revoked: boolean;
  note?: string;
  removed: { messages: number; events: number; files: number; tasks: number };
}

/**
 * Disconnects one person's app in one workspace: revokes the access at the provider where it supports that,
 * deletes STACK's stored credentials (and with them the sync positions), everything synced from it, and any queued
 * syncs. Used by the person themselves and by a workspace admin offboarding them - the effect is identical.
 */
export async function disconnectIntegration(workspaceId: string, userId: string, provider: string): Promise<DisconnectResult> {
  const row = await db.integration.findUnique({ where: { workspaceId_userId_provider: { workspaceId, userId, provider } } });
  if (!row) return { revoked: false, removed: { messages: 0, events: 0, files: 0, tasks: 0 } };

  let revoke: RevokeResult = { revoked: false, note: "There was no saved access to revoke." };
  if (row.accessToken) {
    try {
      revoke = await revokeConnection(provider, {
        accessToken: decrypt(row.accessToken),
        refreshToken: row.refreshToken ? decrypt(row.refreshToken) : undefined,
        scopes: row.scopes,
      });
    } catch (err) {
      console.error("revoke failed", provider, err);
      revoke = { revoked: false, note: "STACK deleted its stored access. You can also remove STACK from the app's own settings." };
    }
  }

  const where = { workspaceId, userId, provider };
  const [messages, events, files, tasks] = await db.$transaction([
    db.syncedMessage.deleteMany({ where }),
    db.syncedEvent.deleteMany({ where }),
    db.syncedFile.deleteMany({ where }),
    db.syncedTask.deleteMany({ where }),
    db.syncJob.deleteMany({ where: { ...where, status: { in: ["Queued", "Running"] } } }),
    db.integration.deleteMany({ where }),
  ]);

  // Links and derived signals pointed at the removed content; rebuild so nothing dangles.
  await buildContextGraph(workspaceId).catch((e) => console.error("graph rebuild after disconnect failed", e));
  invalidateWorkState(workspaceId, userId);
  return { revoked: revoke.revoked, note: revoke.note, removed: { messages: messages.count, events: events.count, files: files.count, tasks: tasks.count } };
}
