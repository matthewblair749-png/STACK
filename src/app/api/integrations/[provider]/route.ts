import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace, UnauthorizedError, ForbiddenError } from "@/server/workspace";
import { disconnectIntegration } from "@/server/integrations/disconnect";
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
    const result = await disconnectIntegration(workspaceId, userId, provider);
    await audit({ workspaceId, userId, action: "integration.disconnected", target: provider, detail: { revoked: result.revoked, removed: result.removed } });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("DELETE /api/integrations/[provider] failed", err);
    return NextResponse.json({ error: "Couldn't disconnect. Try again." }, { status: 500 });
  }
}
