import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace, ForbiddenError } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const existing = await db.pendingAction.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Action not found." }, { status: 404 });
    }
    if (existing.userId !== session.user.id) {
      throw new ForbiddenError("Only the person who requested this action can reject it.");
    }

    const claim = await db.pendingAction.updateMany({
      where: { id, status: "Pending" },
      data: { status: "Rejected" },
    });
    if (claim.count !== 1) {
      return NextResponse.json({ error: "This action was already handled." }, { status: 409 });
    }
    const action = await db.pendingAction.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({ action });
  } catch (err) {
    return handleApiError(err, "POST /api/actions/[id]/reject failed");
  }
}
