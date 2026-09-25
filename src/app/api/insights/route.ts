import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";

export async function GET() {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const insights = await db.insight.findMany({
      where: { workspaceId, userId: session.user.id, status: "Open" },
      orderBy: [{ level: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ insights });
  } catch (err) {
    return handleApiError(err, "GET /api/insights failed");
  }
}
