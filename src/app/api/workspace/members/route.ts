import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { memberToPerson } from "@/server/mappers";

export async function GET() {
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const members = await db.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ people: members.map(memberToPerson) });
  } catch (err) {
    return handleApiError(err, "GET /api/workspace/members failed");
  }
}
