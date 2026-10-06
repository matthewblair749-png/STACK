import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { VISIBLE_MEMORY } from "@/server/work/memory";

export async function GET() {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const items = await db.memoryItem.findMany({
      where: { workspaceId, userId: session.user.id, ...VISIBLE_MEMORY },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err, "GET /api/memory failed");
  }
}
