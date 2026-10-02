import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_WORKSPACE_COOKIE, requireSession } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { acceptInvite, previewInvite } from "@/server/invites";

/** What the invite is for. Requires sign-in, so a leaked link can't be used to probe workspace names anonymously. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const session = await requireSession();
    const { status, workspaceName, invitedBy, role } = await previewInvite(token, session.user.id);
    return NextResponse.json({ status, workspaceName, invitedBy, role });
  } catch (err) {
    return handleApiError(err, "GET /api/invites/[token] failed");
  }
}

/** Joins the workspace and makes it the active one. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const session = await requireSession();
    const workspaceId = await acceptInvite(token, session.user.id);
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
    return handleApiError(err, "POST /api/invites/[token] failed");
  }
}
