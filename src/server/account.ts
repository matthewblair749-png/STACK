import { db } from "./db";
import { decrypt } from "./crypto";
import { revokeConnection } from "./integrations/revoke";

/** Permanently deletes a user, every workspace they own, and everything private to them. */
export async function deleteUserAccount(uid: string) {
  // Revoke every app grant at the provider first (best effort), so deleting the account also cuts off
  // access at Google, Slack, etc. - not just STACK's stored copy of the tokens.
  const grants = await db.integration.findMany({ where: { userId: uid }, select: { provider: true, accessToken: true, refreshToken: true, scopes: true } });
  await Promise.all(
    grants
      .filter((g) => g.accessToken)
      .map(async (g) => {
        try {
          await revokeConnection(g.provider, { accessToken: decrypt(g.accessToken!), refreshToken: g.refreshToken ? decrypt(g.refreshToken) : undefined, scopes: g.scopes });
        } catch (e) {
          // A failed revoke (or an undecryptable old token) must never block deleting the account.
          console.error("revoke during account deletion failed", g.provider, e);
        }
      }),
  );

  const ownedWorkspaces = await db.workspace.findMany({ where: { ownerId: uid }, select: { id: true } });

  // In teammates' workspaces, shared things they created (tasks, automations, call history) belong to the
  // team, so they pass to that workspace's owner instead of blocking the deletion or vanishing.
  // Includes workspaces they've already left - leaving keeps the tasks they created there.
  const joined = await db.workspace.findMany({
    where: {
      ownerId: { not: uid },
      OR: [
        { members: { some: { userId: uid } } },
        { tasks: { some: { creatorId: uid } } },
        { automations: { some: { creatorId: uid } } },
        { calls: { some: { hostId: uid } } },
      ],
    },
    select: { id: true, ownerId: true },
  });
  const handOver = joined.flatMap((w) => [
    db.task.updateMany({ where: { workspaceId: w.id, creatorId: uid }, data: { creatorId: w.ownerId } }),
    db.automation.updateMany({ where: { workspaceId: w.id, creatorId: uid }, data: { creatorId: w.ownerId } }),
    db.call.updateMany({ where: { workspaceId: w.id, hostId: uid }, data: { hostId: w.ownerId } }),
  ]);

  await db.$transaction([
    ...handOver,
    ...ownedWorkspaces.map((w) => db.workspace.delete({ where: { id: w.id } })),
    db.user.delete({ where: { id: uid } }),
  ]);
}
