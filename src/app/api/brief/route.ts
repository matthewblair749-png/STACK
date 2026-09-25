import { NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { buildDailyBrief, getWorkState } from "@/server/work/state";

/** The daily brief only (same real data as /api/work/state, without the full state payload). */
export async function GET() {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const state = await getWorkState(workspaceId, session.user.id);
    const firstName = session.user.name?.split(" ")[0] ?? "there";
    return NextResponse.json({ brief: buildDailyBrief(state, firstName) });
  } catch (err) {
    return handleApiError(err, "GET /api/brief failed");
  }
}
