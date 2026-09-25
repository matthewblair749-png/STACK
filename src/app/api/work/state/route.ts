import { NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { buildDailyBrief, getWorkState } from "@/server/work/state";

export async function GET() {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const state = await getWorkState(workspaceId, session.user.id);
    const firstName = session.user.name?.split(" ")[0] ?? "there";
    return NextResponse.json({ state, brief: buildDailyBrief(state, firstName) });
  } catch (err) {
    return handleApiError(err, "GET /api/work/state failed");
  }
}
