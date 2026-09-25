import { NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { computeProjectOverview } from "@/server/work/project-intel";

export async function GET() {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    return NextResponse.json({ projects: await computeProjectOverview(workspaceId, session.user.id) });
  } catch (err) {
    return handleApiError(err, "GET /api/projects/overview failed");
  }
}
