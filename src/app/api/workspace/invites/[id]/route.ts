import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { revokeInvite } from "@/server/invites";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, workspaceId, role } = await requireSessionAndWorkspace();
    await revokeInvite(workspaceId, session.user.id, role, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/workspace/invites/[id] failed");
  }
}
