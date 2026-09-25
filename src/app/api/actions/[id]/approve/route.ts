import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace, ForbiddenError } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { executePendingAction } from "@/server/actions/execute";
import { invalidateWorkState } from "@/server/work/state";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = (await req.json().catch(() => ({}))) as { payload?: unknown };

    const existing = await db.pendingAction.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Action not found." }, { status: 404 });
    }
    // Provider tokens are per-user, not workspace-shared — a teammate approving
    // someone else's proposal would otherwise execute with the wrong/no token.
    if (existing.userId !== session.user.id) {
      throw new ForbiddenError("Only the person who requested this action can approve it.");
    }

    if (body.payload) {
      await db.pendingAction.update({ where: { id }, data: { payload: body.payload as object } });
    }

    // Atomic claim: only one approve click can ever win this race.
    const claim = await db.pendingAction.updateMany({
      where: { id, status: "Pending" },
      data: { status: "Executed" },
    });
    if (claim.count !== 1) {
      return NextResponse.json({ error: "This action was already handled." }, { status: 409 });
    }

    invalidateWorkState(workspaceId, session.user.id);
    const toExecute = await db.pendingAction.findUniqueOrThrow({ where: { id } });
    try {
      const resultMetadata = await executePendingAction(toExecute);
      const action = await db.pendingAction.update({
        where: { id },
        data: { resultMetadata: resultMetadata as object },
      });
      return NextResponse.json({ action });
    } catch (execErr) {
      const message = execErr instanceof Error ? execErr.message : String(execErr);
      const action = await db.pendingAction.update({
        where: { id },
        data: { status: "Failed", errorMessage: message },
      });
      return NextResponse.json({ action }, { status: 502 });
    }
  } catch (err) {
    return handleApiError(err, "POST /api/actions/[id]/approve failed");
  }
}
