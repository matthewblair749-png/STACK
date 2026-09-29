import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { CallNotFoundError, getCallState, iceServers } from "@/server/calls";

/** Polled every few seconds by everyone in the room to see who's there. `?as=peerId` marks which tile is "you". */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const state = await getCallState(id, workspaceId);
    const asPeerId = req.nextUrl.searchParams.get("as");
    return NextResponse.json({
      ...state,
      participants: state.participants.map((p) => ({ ...p, isYou: p.peerId === asPeerId })),
      iceServers: iceServers(),
    });
  } catch (err) {
    if (err instanceof CallNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    return handleApiError(err, "GET /api/calls/[id] failed");
  }
}
