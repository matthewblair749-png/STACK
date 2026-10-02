import { NextResponse } from "next/server";
import { ACTIVE_WORKSPACE_COOKIE, requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { leaveWorkspace } from "@/server/invites";

/** Leave the active workspace. Your connections and synced data in it are removed; shared tasks stay. */
export async function POST() {
  try {
    const { session, workspaceId, role } = await requireSessionAndWorkspace();
    await leaveWorkspace(workspaceId, session.user.id, role);
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(ACTIVE_WORKSPACE_COOKIE);
    return res;
  } catch (err) {
    return handleApiError(err, "POST /api/workspace/leave failed");
  }
}
