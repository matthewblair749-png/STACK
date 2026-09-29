import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { CallNotFoundError, heartbeat, leaveCall } from "@/server/calls";

/**
 * "I'm still here" ping (every ~10s) plus mic/camera state. A tab that stops pinging is reaped as gone.
 * `leaving: true` (sent via navigator.sendBeacon on tab close/unload, which can only POST) leaves instead -
 * that's the one path a page-unload can reliably fire.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = await req.json().catch(() => ({}));
    const peerId = typeof body.peerId === "string" ? body.peerId : "";
    if (!peerId) return NextResponse.json({ error: "Missing peerId." }, { status: 400 });
    if (body.leaving === true) {
      await leaveCall(id, workspaceId, session.user.id, peerId);
      return NextResponse.json({ ok: true });
    }
    await heartbeat(id, workspaceId, session.user.id, peerId, {
      micOn: typeof body.micOn === "boolean" ? body.micOn : undefined,
      cameraOn: typeof body.cameraOn === "boolean" ? body.cameraOn : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CallNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    return handleApiError(err, "POST /api/calls/[id]/heartbeat failed");
  }
}

/** Leaving the tab/page: best-effort explicit leave (also happens automatically once the heartbeat goes stale). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = await req.json().catch(() => ({}));
    const peerId = typeof body.peerId === "string" ? body.peerId : "";
    if (!peerId) return NextResponse.json({ error: "Missing peerId." }, { status: 400 });
    await leaveCall(id, workspaceId, session.user.id, peerId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CallNotFoundError) return NextResponse.json({ ok: true }); // Already gone - leaving is idempotent.
    return handleApiError(err, "DELETE /api/calls/[id]/heartbeat failed");
  }
}
