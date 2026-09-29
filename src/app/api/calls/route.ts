import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { createCall, listRecentCalls } from "@/server/calls";
import { audit } from "@/server/audit";

/** Recent calls in this workspace - anyone can start one, so anyone can see the list (not just their own). */
export async function GET() {
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const calls = await listRecentCalls(workspaceId);
    return NextResponse.json({ calls });
  } catch (err) {
    return handleApiError(err, "GET /api/calls failed");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.slice(0, 100) : undefined;
    const call = await createCall(workspaceId, session.user.id, title);
    await audit({ workspaceId, userId: session.user.id, action: "call.started", target: call.id });
    return NextResponse.json({ call });
  } catch (err) {
    return handleApiError(err, "POST /api/calls failed");
  }
}
