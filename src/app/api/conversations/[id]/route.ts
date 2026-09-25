import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const conversation = await db.conversation.findFirst({
      where: { id, workspaceId, userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    // Proposed actions are stored by id; report their current status so a reloaded chat never shows a
    // stale "Approve" button for something already approved, rejected or failed.
    const actionIds = conversation.messages.flatMap((m) => ((m.data as { pendingActions?: { id: string }[] } | null)?.pendingActions ?? []).map((a) => a.id));
    const actions = actionIds.length ? await db.pendingAction.findMany({ where: { id: { in: actionIds } }, select: { id: true, status: true } }) : [];
    const statusById = Object.fromEntries(actions.map((a) => [a.id, a.status]));

    return NextResponse.json({
      conversation: { id: conversation.id, title: conversation.title },
      messages: conversation.messages.map((m) => ({ id: m.id, role: m.role, text: m.text, data: m.data, createdAt: m.createdAt.toISOString() })),
      actionStatus: statusById,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/conversations/[id] failed");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const result = await db.conversation.deleteMany({ where: { id, workspaceId, userId: session.user.id } });
    if (result.count === 0) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/conversations/[id] failed");
  }
}
