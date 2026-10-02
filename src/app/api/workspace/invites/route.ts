import { NextRequest, NextResponse } from "next/server";
import type { WorkspaceRole } from "@prisma/client";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { createInvite, listPendingInvites } from "@/server/invites";

export async function GET() {
  try {
    const { workspaceId, role } = await requireSessionAndWorkspace();
    // Members don't manage invites, so they don't see them either.
    if (role !== "Owner" && role !== "Admin") return NextResponse.json({ invites: [] });
    return NextResponse.json({ invites: await listPendingInvites(workspaceId) });
  } catch (err) {
    return handleApiError(err, "GET /api/workspace/invites failed");
  }
}

/** Creates a single-use link. The raw token is returned once, here, and never stored. */
export async function POST(req: NextRequest) {
  try {
    const { session, workspaceId, role } = await requireSessionAndWorkspace();
    const body = (await req.json().catch(() => ({}))) as { role?: WorkspaceRole };
    const { token, invite } = await createInvite(workspaceId, session.user.id, role, body.role === "Admin" ? "Admin" : "Member");
    const url = `${req.nextUrl.origin}/invite/${token}`;
    return NextResponse.json({ invite: { ...invite, createdAt: invite.createdAt.toISOString(), expiresAt: invite.expiresAt.toISOString() }, url });
  } catch (err) {
    return handleApiError(err, "POST /api/workspace/invites failed");
  }
}
