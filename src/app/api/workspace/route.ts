import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";

export async function GET() {
  try {
    const { workspaceId, role } = await requireSessionAndWorkspace();
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }
    return NextResponse.json({ workspace: { ...workspace, role } });
  } catch (err) {
    return handleApiError(err, "GET /api/workspace failed");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { workspaceId, role } = await requireSessionAndWorkspace();
    if (role !== "Owner" && role !== "Admin") {
      return NextResponse.json({ error: "Only workspace owners and admins can rename the workspace." }, { status: 403 });
    }
    const body = (await req.json()) as { name?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
    }
    const workspace = await db.workspace.update({
      where: { id: workspaceId },
      data: { name: body.name.trim() },
      select: { id: true, name: true },
    });
    return NextResponse.json({ workspace: { ...workspace, role } });
  } catch (err) {
    return handleApiError(err, "PATCH /api/workspace failed");
  }
}
