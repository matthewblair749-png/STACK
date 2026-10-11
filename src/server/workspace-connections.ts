import type { WorkspaceRole } from "@prisma/client";
import { db } from "@/server/db";
import { ApiError } from "@/server/api-error";
import { audit } from "@/server/audit";
import { disconnectIntegration, type DisconnectResult } from "@/server/integrations/disconnect";

/**
 * Who may disconnect whose apps, mirroring who may remove whom: the owner can act on admins and members, an admin
 * on members only, and nobody on the owner (they manage their own apps). Your own apps are managed on your own
 * Connected Apps page, not here.
 */
export function canDisconnectFor(actorRole: WorkspaceRole, targetRole: WorkspaceRole, isSelf: boolean): boolean {
  if (isSelf || targetRole === "Owner") return false;
  if (actorRole === "Owner") return true;
  return actorRole === "Admin" && targetRole === "Member";
}

const asMeta = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * Every member's connected apps, for owners and admins: which app and account, connection health, last sync and the
 * permissions granted. Never tokens, and never any synced content - that stays visible only to its owner.
 */
export async function listWorkspaceConnections(workspaceId: string, actorId: string, actorRole: WorkspaceRole) {
  if (actorRole !== "Owner" && actorRole !== "Admin") throw new ApiError(403, "Only owners and admins can see the team's connected apps.");
  const [members, integrations] = await Promise.all([
    db.workspaceMember.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" }, select: { userId: true, role: true, user: { select: { name: true, email: true } } } }),
    db.integration.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: { userId: true, provider: true, scopes: true, metadata: true, createdAt: true, lastSyncAt: true, lastSyncError: true, syncError: true },
    }),
  ]);
  return members.map((m) => ({
    userId: m.userId,
    name: m.user.name ?? m.user.email ?? "Teammate",
    email: m.user.email,
    role: m.role,
    isYou: m.userId === actorId,
    canDisconnect: canDisconnectFor(actorRole, m.role, m.userId === actorId),
    connections: integrations
      .filter((i) => i.userId === m.userId)
      .map((i) => {
        const meta = asMeta(i.metadata);
        return {
          provider: i.provider,
          account: typeof meta.account === "string" ? meta.account : null,
          method: meta.method === "token" ? ("token" as const) : ("oauth" as const),
          health: i.syncError ? ("expired" as const) : i.lastSyncError ? ("needs_attention" as const) : i.lastSyncAt ? ("connected" as const) : ("pending" as const),
          problem: i.syncError ?? i.lastSyncError ?? null,
          connectedAt: i.createdAt,
          lastSyncAt: i.lastSyncAt,
          scopes: i.scopes,
        };
      }),
  }));
}

/** An owner or admin disconnects a member's app (offboarding, or a compromised account). Audited for both sides. */
export async function disconnectForMember(workspaceId: string, actorId: string, actorRole: WorkspaceRole, targetUserId: string, provider: string): Promise<DisconnectResult> {
  const target = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: targetUserId } }, select: { role: true } });
  if (!target) throw new ApiError(404, "That person isn't in this workspace.");
  if (!canDisconnectFor(actorRole, target.role, actorId === targetUserId)) {
    throw new ApiError(403, actorId === targetUserId ? "Manage your own apps on the Connected Apps page." : "You can't disconnect this person's apps.");
  }
  const exists = await db.integration.findUnique({ where: { workspaceId_userId_provider: { workspaceId, userId: targetUserId, provider } }, select: { id: true } });
  if (!exists) throw new ApiError(404, "That app isn't connected for this person.");

  const result = await disconnectIntegration(workspaceId, targetUserId, provider);
  const detail = { revoked: result.revoked, removed: result.removed, byAdmin: actorId, member: targetUserId };
  // Recorded under both people, so it shows in the member's own app history as well as the admin's.
  await Promise.all([
    audit({ workspaceId, userId: targetUserId, action: "integration.disconnected", target: provider, detail }),
    audit({ workspaceId, userId: actorId, action: "integration.disconnected_for_member", target: provider, detail }),
  ]);
  return result;
}
