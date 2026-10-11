import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { disconnectForMember } from "@/server/workspace-connections";

/** An owner or admin disconnects a member's app: revoked where possible, synced data deleted, audited. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string; provider: string }> }) {
  try {
    const { userId, provider } = await params;
    const { session, workspaceId, role } = await requireSessionAndWorkspace();
    const result = await disconnectForMember(workspaceId, session.user.id, role, userId, provider);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return handleApiError(err, "DELETE /api/workspace/connections/[userId]/[provider] failed");
  }
}
