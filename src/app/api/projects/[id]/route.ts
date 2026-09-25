import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { projectToClient, clientProjectStatusToDb } from "@/server/mappers";
import type { Project } from "@/lib/types";

async function countsFor(workspaceId: string, projectId: string) {
  const [taskCount, completedCount, members] = await Promise.all([
    db.task.count({ where: { workspaceId, projectId } }),
    db.task.count({ where: { workspaceId, projectId, status: "Done" } }),
    db.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true } }),
  ]);
  return { taskCount, completedCount, memberIds: members.map((m) => m.userId) };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const row = await db.project.findFirst({ where: { id, workspaceId } });
    if (!row) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const counts = await countsFor(workspaceId, id);
    return NextResponse.json({ project: projectToClient(row, counts) });
  } catch (err) {
    return handleApiError(err, "GET /api/projects/[id] failed");
  }
}

interface UpdateProjectBody {
  name?: string;
  description?: string;
  status?: Project["status"];
  deadline?: string | null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const existing = await db.project.findFirst({ where: { id, workspaceId } });
    if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const body = (await req.json()) as UpdateProjectBody;

    let deadline: Date | null | undefined = undefined;
    if (body.deadline !== undefined) {
      deadline = body.deadline ? new Date(body.deadline) : null;
      if (deadline && Number.isNaN(deadline.getTime())) {
        return NextResponse.json({ error: "That deadline isn't valid." }, { status: 400 });
      }
    }

    const row = await db.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.status !== undefined ? { status: clientProjectStatusToDb(body.status) } : {}),
        ...(deadline !== undefined ? { deadline } : {}),
      },
    });

    const counts = await countsFor(workspaceId, id);
    return NextResponse.json({ project: projectToClient(row, counts) });
  } catch (err) {
    return handleApiError(err, "PATCH /api/projects/[id] failed");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const existing = await db.project.findFirst({ where: { id, workspaceId } });
    if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    await db.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/projects/[id] failed");
  }
}
