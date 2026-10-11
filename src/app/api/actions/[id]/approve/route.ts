import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { approvePendingAction } from "@/server/actions/approve";
import { invalidateWorkState } from "@/server/work/state";

/** Approves and runs a proposed action. Only its owner can; see approvePendingAction for the safeguards. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = (await req.json().catch(() => ({}))) as { payload?: unknown; confirmDuplicate?: unknown };
    const result = await approvePendingAction({
      actionId: id,
      workspaceId,
      userId: session.user.id,
      payload: body.payload,
      confirmDuplicate: body.confirmDuplicate === true,
    });
    if (result.status === 200 || result.status === 502) invalidateWorkState(workspaceId, session.user.id);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    return handleApiError(err, "POST /api/actions/[id]/approve failed");
  }
}
