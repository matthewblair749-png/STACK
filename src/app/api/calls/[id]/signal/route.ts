import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { CallNotFoundError, pollSignals, postSignal } from "@/server/calls";

/** Sends one WebRTC signaling message (offer/answer/candidate) to another participant's peerId. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = await req.json().catch(() => ({}));
    const { fromPeerId, toPeerId, type, payload } = body ?? {};
    if (typeof fromPeerId !== "string" || typeof toPeerId !== "string" || typeof type !== "string" || payload === undefined) {
      return NextResponse.json({ error: "Malformed signal." }, { status: 400 });
    }
    await postSignal(id, workspaceId, session.user.id, fromPeerId, toPeerId, type, payload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CallNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    return handleApiError(err, "POST /api/calls/[id]/signal failed");
  }
}

/** Polled every ~1s: returns and deletes every signal addressed to `?to=peerId` since the last poll. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const toPeerId = req.nextUrl.searchParams.get("to") ?? "";
    if (!toPeerId) return NextResponse.json({ error: "Missing to." }, { status: 400 });
    const signals = await pollSignals(id, workspaceId, session.user.id, toPeerId);
    return NextResponse.json({ signals });
  } catch (err) {
    if (err instanceof CallNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    return handleApiError(err, "GET /api/calls/[id]/signal failed");
  }
}
