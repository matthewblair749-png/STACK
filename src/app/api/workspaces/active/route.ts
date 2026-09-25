import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_WORKSPACE_COOKIE, requireSession, requireWorkspaceMembership } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";

/** Switch the active workspace. Rejected unless the caller is a member of it. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { workspaceId } = (await req.json()) as { workspaceId?: string };
    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    await requireWorkspaceMembership(session.user.id, workspaceId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (err) {
    return handleApiError(err, "POST /api/workspaces/active failed");
  }
}
