import { NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { listWorkspaceConnections } from "@/server/workspace-connections";

/** Owners and admins: every member's connected apps (no tokens, no content). */
export async function GET() {
  try {
    const { session, workspaceId, role } = await requireSessionAndWorkspace();
    return NextResponse.json({ members: await listWorkspaceConnections(workspaceId, session.user.id, role) });
  } catch (err) {
    return handleApiError(err, "GET /api/workspace/connections failed");
  }
}
