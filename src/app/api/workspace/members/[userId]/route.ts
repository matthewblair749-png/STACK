import { NextRequest, NextResponse } from "next/server";
import type { WorkspaceRole } from "@prisma/client";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { changeRole, removeMember } from "@/server/invites";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const { session, workspaceId, role } = await requireSessionAndWorkspace();
    const body = (await req.json().catch(() => ({}))) as { role?: WorkspaceRole };
    await changeRole(workspaceId, session.user.id, role, userId, body.role ?? "Member");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, "PATCH /api/workspace/members/[userId] failed");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const { session, workspaceId, role } = await requireSessionAndWorkspace();
    await removeMember(workspaceId, session.user.id, role, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/workspace/members/[userId] failed");
  }
}
