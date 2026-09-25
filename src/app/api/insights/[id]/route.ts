import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = (await req.json()) as { status?: string };
    if (body.status !== "Dismissed") {
      return NextResponse.json({ error: 'Only {"status":"Dismissed"} is supported.' }, { status: 400 });
    }

    const existing = await db.insight.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspaceId || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Insight not found." }, { status: 404 });
    }

    const insight = await db.insight.update({ where: { id }, data: { status: "Dismissed" } });
    return NextResponse.json({ insight });
  } catch (err) {
    return handleApiError(err, "PATCH /api/insights/[id] failed");
  }
}
