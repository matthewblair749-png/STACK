import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { decrypt } from "@/server/crypto";
import { requireSessionAndWorkspace, UnauthorizedError, ForbiddenError } from "@/server/workspace";
import { revokeConnection } from "@/server/integrations/revoke";
import { buildContextGraph } from "@/server/sync/context-graph";
import { invalidateWorkState } from "@/server/work/state";
import { audit } from "@/server/audit";

/**
 * Disconnects an app: revokes the access at the provider where it supports that, deletes STACK's stored
 * credentials, and removes the content that was imported from it (STACK has no separate retention setting yet,
 * so the safe default is to not keep another app's data once you disconnect it).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const userId = session.user.id;

    const row = await db.integration.findUnique({ where: { workspaceId_userId_provider: { workspaceId, userId, provider } } });
    if (!row) return NextResponse.json({ ok: true, revoked: false, removed: { messages: 0, events: 0, files: 0 } });

    let revoke: { revoked: boolean; note?: string } = { revoked: false, note: "There was no saved access to revoke." };
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
    const [messages, events, files] = await db.$transaction([
      db.syncedMessage.deleteMany({ where }),
      db.syncedEvent.deleteMany({ where }),
      db.syncedFile.deleteMany({ where }),
      db.integration.deleteMany({ where }),
    ]);

    // Links and derived signals pointed at the removed content; rebuild so nothing dangles.
    await buildContextGraph(workspaceId).catch((e) => console.error("graph rebuild after disconnect failed", e));
    invalidateWorkState(workspaceId, userId);
    await audit({ workspaceId, userId, action: "integration.disconnected", target: provider, detail: { revoked: revoke.revoked, removed: { messages: messages.count, events: events.count, files: files.count } } });

    return NextResponse.json({ ok: true, revoked: revoke.revoked, note: revoke.note, removed: { messages: messages.count, events: events.count, files: files.count } });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("DELETE /api/integrations/[provider] failed", err);
    return NextResponse.json({ error: "Couldn't disconnect. Try again." }, { status: 500 });
  }
}
