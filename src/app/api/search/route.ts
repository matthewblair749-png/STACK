import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { searchWorkspace } from "@/server/work/search";

export async function GET(req: NextRequest) {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const q = req.nextUrl.searchParams.get("q") ?? "";
    return NextResponse.json(await searchWorkspace(workspaceId, session.user.id, q), {
      headers: { "Cache-Control": "private, max-age=5" },
    });
  } catch (err) {
    return handleApiError(err, "GET /api/search failed");
  }
}
