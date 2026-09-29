import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { CallNotFoundError, iceServers, joinCall } from "@/server/calls";

/** Seats you in the call under a peerId your browser just generated. Call this once when the room page mounts. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = await req.json().catch(() => ({}));
    const peerId = typeof body.peerId === "string" ? body.peerId : "";
    if (!peerId) return NextResponse.json({ error: "Missing peerId." }, { status: 400 });
    const displayName = typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim() : (session.user.name ?? session.user.email ?? "Someone");
    await joinCall(id, workspaceId, session.user.id, peerId, displayName);
    return NextResponse.json({ ok: true, iceServers: iceServers() });
  } catch (err) {
    if (err instanceof CallNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    return handleApiError(err, "POST /api/calls/[id]/join failed");
  }
}
