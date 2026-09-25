import { cookies } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this workspace.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  return session as typeof session & { user: { id: string } };
}

export async function getDefaultWorkspaceId(userId: string): Promise<string | null> {
  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  return membership?.workspaceId ?? null;
}

export async function requireWorkspaceMembership(userId: string, workspaceId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) throw new ForbiddenError();
  return membership;
}

/**
 * The single enforcement point every API route calls before touching workspace-scoped
 * data. Resolves the caller's session, picks their default workspace when none is
 * specified, and verifies membership. Never trust a workspaceId supplied by the client
 * without this check.
 */
export const ACTIVE_WORKSPACE_COOKIE = "stack_ws";

/**
 * The workspace the user last switched to (cookie), falling back to their first membership.
 * The cookie is only a preference: membership is re-verified here on every request, so a forged
 * or stale value can never grant access to a workspace the user doesn't belong to.
 */
async function resolveActiveWorkspaceId(userId: string): Promise<string | null> {
  try {
    const preferred = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
    if (preferred) {
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: preferred, userId } },
        select: { workspaceId: true },
      });
      if (membership) return membership.workspaceId;
    }
  } catch {
    // Not in a request scope, or cookies unavailable - fall through to the default.
  }
  return getDefaultWorkspaceId(userId);
}

export async function requireSessionAndWorkspace(workspaceId?: string) {
  const session = await requireSession();
  const wsId = workspaceId ?? (await resolveActiveWorkspaceId(session.user.id));
  if (!wsId) {
    throw new ForbiddenError("No workspace found for this account.");
  }
  const membership = await requireWorkspaceMembership(session.user.id, wsId);
  return { session, workspaceId: wsId, role: membership.role };
}
