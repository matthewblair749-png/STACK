import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";

/** Every workspace the caller belongs to, with the active one marked. */
export async function GET() {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const memberships = await db.workspaceMember.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { role: true, workspace: { select: { id: true, name: true } } },
    });
    return NextResponse.json({
      workspaces: memberships.map((m) => ({ id: m.workspace.id, name: m.workspace.name, role: m.role, active: m.workspace.id === workspaceId })),
    });
  } catch (err) {
    return handleApiError(err, "GET /api/workspaces failed");
  }
}
