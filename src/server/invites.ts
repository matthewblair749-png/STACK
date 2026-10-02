import crypto from "node:crypto";
import type { WorkspaceRole } from "@prisma/client";
import { db } from "./db";
import { decrypt } from "./crypto";
import { revokeConnection } from "./integrations/revoke";
import { invalidateWorkState } from "./work/state";
import { audit } from "./audit";
import { ApiError as InviteError } from "./api-error";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Generous for a team, small enough that a leaked admin account can't fill a workspace with strangers. */
export const MAX_MEMBERS = 25;
const MAX_PENDING_INVITES = 20;

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const canManage = (role: WorkspaceRole) => role === "Owner" || role === "Admin";

export async function createInvite(workspaceId: string, creatorId: string, creatorRole: WorkspaceRole, role: WorkspaceRole) {
  if (!canManage(creatorRole)) throw new InviteError(403, "Only owners and admins can invite people.");
  if (role === "Owner") throw new InviteError(400, "A workspace has exactly one owner.");
  if (role === "Admin" && creatorRole !== "Owner") throw new InviteError(403, "Only the owner can invite admins.");

  const [members, pending] = await Promise.all([
    db.workspaceMember.count({ where: { workspaceId } }),
    db.workspaceInvite.count({ where: { workspaceId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  if (members + pending >= MAX_MEMBERS) throw new InviteError(409, `Workspaces can have up to ${MAX_MEMBERS} people, including pending invites.`);
  if (pending >= MAX_PENDING_INVITES) throw new InviteError(409, "Too many open invites. Revoke some before creating more.");

  // 32 random bytes: unguessable. The raw token only ever exists in the link; the database keeps its hash.
  const token = crypto.randomBytes(32).toString("base64url");
  const invite = await db.workspaceInvite.create({
    data: { workspaceId, tokenHash: hash(token), role, createdById: creatorId, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
    select: { id: true, role: true, createdAt: true, expiresAt: true },
  });
  await audit({ workspaceId, userId: creatorId, action: "invite.created", target: invite.id, detail: { role } });
  return { token, invite };
}

export async function listPendingInvites(workspaceId: string) {
  const rows = await db.workspaceInvite.findMany({
    where: { workspaceId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, role: true, createdAt: true, expiresAt: true, createdBy: { select: { name: true, email: true } } },
  });
  return rows.map((r) => ({ id: r.id, role: r.role, createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt.toISOString(), createdBy: r.createdBy.name ?? r.createdBy.email ?? "Someone" }));
}

export async function revokeInvite(workspaceId: string, actorId: string, actorRole: WorkspaceRole, inviteId: string) {
  if (!canManage(actorRole)) throw new InviteError(403, "Only owners and admins can revoke invites.");
  const res = await db.workspaceInvite.updateMany({ where: { id: inviteId, workspaceId, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  if (res.count !== 1) throw new InviteError(404, "That invite doesn't exist or was already used.");
  await audit({ workspaceId, userId: actorId, action: "invite.revoked", target: inviteId });
}

type InviteStatus = "valid" | "expired" | "used" | "revoked" | "already_member" | "full";

/** What the invite page shows before someone joins. Never reveals anything beyond the workspace name and who invited them. */
export async function previewInvite(token: string, userId: string) {
  const invite = await db.workspaceInvite.findUnique({
    where: { tokenHash: hash(token) },
    include: { workspace: { select: { id: true, name: true } }, createdBy: { select: { name: true, email: true } } },
  });
  if (!invite) throw new InviteError(404, "This invite link isn't valid. Ask for a new one.");
  const member = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } } });
  let status: InviteStatus = "valid";
  if (member) status = "already_member";
  else if (invite.revokedAt) status = "revoked";
  else if (invite.acceptedAt) status = "used";
  else if (invite.expiresAt < new Date()) status = "expired";
  else if ((await db.workspaceMember.count({ where: { workspaceId: invite.workspaceId } })) >= MAX_MEMBERS) status = "full";
  return {
    status,
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspace.name,
    invitedBy: invite.createdBy.name ?? invite.createdBy.email ?? "A teammate",
    role: invite.role,
  };
}

/** Joins the workspace. Single use: the invite is claimed atomically, so two people can't both use one link. */
export async function acceptInvite(token: string, userId: string): Promise<string> {
  const preview = await previewInvite(token, userId);
  if (preview.status === "already_member") return preview.workspaceId;
  if (preview.status !== "valid") {
    const why: Record<Exclude<InviteStatus, "valid" | "already_member">, string> = {
      expired: "This invite has expired. Ask for a new one.",
      used: "This invite has already been used. Ask for a new one.",
      revoked: "This invite was cancelled. Ask for a new one.",
      full: `This workspace already has ${MAX_MEMBERS} people.`,
    };
    throw new InviteError(410, why[preview.status]);
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    const claim = await tx.workspaceInvite.updateMany({
      where: { tokenHash: hash(token), acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { acceptedAt: now, acceptedById: userId },
    });
    if (claim.count !== 1) throw new InviteError(410, "This invite has already been used. Ask for a new one.");
    await tx.workspaceMember.create({ data: { workspaceId: preview.workspaceId, userId, role: preview.role } });
  });
  await audit({ workspaceId: preview.workspaceId, userId, action: "invite.accepted", detail: { role: preview.role } });
  return preview.workspaceId;
}

/**
 * Removes everything private a person had in a workspace they're no longer in: their app connections
 * (revoked at the provider where possible), what was synced from them, their AI chats and drafts.
 * Shared work - tasks and projects - stays with the team; their task assignments are cleared.
 */
async function clearMemberData(workspaceId: string, userId: string) {
  const grants = await db.integration.findMany({ where: { workspaceId, userId }, select: { provider: true, accessToken: true, refreshToken: true, scopes: true } });
  await Promise.all(
    grants
      .filter((g) => g.accessToken)
      .map(async (g) => {
        try {
          await revokeConnection(g.provider, { accessToken: decrypt(g.accessToken!), refreshToken: g.refreshToken ? decrypt(g.refreshToken) : undefined, scopes: g.scopes });
        } catch (e) {
          console.error("revoke while leaving workspace failed", g.provider, e);
        }
      }),
  );
  const where = { workspaceId, userId };
  // Context-graph links are polymorphic (no foreign key), so links from their synced items go explicitly.
  const [msgs, events, files] = await Promise.all([
    db.syncedMessage.findMany({ where, select: { id: true } }),
    db.syncedEvent.findMany({ where, select: { id: true } }),
    db.syncedFile.findMany({ where, select: { id: true } }),
  ]);
  const syncedIds = [...msgs, ...events, ...files].map((r) => r.id);
  await db.$transaction([
    db.entityLink.deleteMany({ where: { workspaceId, fromId: { in: syncedIds } } }),
    // Invites they sent stop working once they're gone - a removed admin's links can't keep adding people.
    db.workspaceInvite.updateMany({ where: { workspaceId, createdById: userId, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } }),
    db.callParticipant.deleteMany({ where: { userId, call: { workspaceId } } }),
    db.integration.deleteMany({ where }),
    db.syncedMessage.deleteMany({ where }),
    db.syncedEvent.deleteMany({ where }),
    db.syncedFile.deleteMany({ where }),
    db.conversation.deleteMany({ where }),
    db.pendingAction.deleteMany({ where }),
    db.insight.deleteMany({ where }),
    db.memoryItem.deleteMany({ where }),
    db.openTab.deleteMany({ where }),
    db.task.updateMany({ where: { workspaceId, assigneeId: userId }, data: { assigneeId: null } }),
    db.task.updateMany({ where: { workspaceId, waitingOnId: userId }, data: { waitingOnId: null } }),
    db.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId, userId } } }),
  ]);
  invalidateWorkState(workspaceId, userId);
}

export async function removeMember(workspaceId: string, actorId: string, actorRole: WorkspaceRole, targetUserId: string) {
  if (actorId === targetUserId) throw new InviteError(400, "To remove yourself, leave the workspace instead.");
  if (!canManage(actorRole)) throw new InviteError(403, "Only owners and admins can remove people.");
  const target = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: targetUserId } } });
  if (!target) throw new InviteError(404, "That person isn't in this workspace.");
  if (target.role === "Owner") throw new InviteError(403, "The owner can't be removed.");
  if (target.role === "Admin" && actorRole !== "Owner") throw new InviteError(403, "Only the owner can remove an admin.");
  await clearMemberData(workspaceId, targetUserId);
  await audit({ workspaceId, userId: actorId, action: "member.removed", target: targetUserId });
}

/** Owner-only: promote a member to admin or back. Ownership itself isn't transferable here. */
export async function changeRole(workspaceId: string, actorId: string, actorRole: WorkspaceRole, targetUserId: string, role: WorkspaceRole) {
  if (actorRole !== "Owner") throw new InviteError(403, "Only the owner can change roles.");
  if (role !== "Admin" && role !== "Member") throw new InviteError(400, "Role must be Admin or Member.");
  const target = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: targetUserId } } });
  if (!target) throw new InviteError(404, "That person isn't in this workspace.");
  if (target.role === "Owner") throw new InviteError(400, "The owner's role can't be changed.");
  await db.workspaceMember.update({ where: { id: target.id }, data: { role } });
  await audit({ workspaceId, userId: actorId, action: "member.role_changed", target: targetUserId, detail: { role } });
}

export async function leaveWorkspace(workspaceId: string, userId: string, role: WorkspaceRole) {
  if (role === "Owner") throw new InviteError(403, "The owner can't leave their own workspace.");
  await clearMemberData(workspaceId, userId);
  await audit({ workspaceId, userId, action: "member.left" });
}
