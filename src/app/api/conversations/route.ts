import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";

export async function GET() {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const conversations = await db.conversation.findMany({
      where: { workspaceId, userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, title: true, updatedAt: true },
    });
    return NextResponse.json({ conversations: conversations.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() })) });
  } catch (err) {
    return handleApiError(err, "GET /api/conversations failed");
  }
}
