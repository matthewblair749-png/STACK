import { NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { syncWorkspaceIntegrations } from "@/server/sync/orchestrator";
import { invalidateWorkState } from "@/server/work/state";

export async function POST() {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const result = await syncWorkspaceIntegrations(workspaceId, session.user.id);
    invalidateWorkState(workspaceId, session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err, "POST /api/integrations/sync failed");
  }
}
