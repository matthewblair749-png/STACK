import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { projectToClient, clientProjectStatusToDb } from "@/server/mappers";
import type { Project } from "@/lib/types";

async function withCounts(workspaceId: string, projectIds: string[]) {
  const [taskCounts, doneCounts, members] = await Promise.all([
    db.task.groupBy({ by: ["projectId"], where: { workspaceId, projectId: { in: projectIds } }, _count: { _all: true } }),
    db.task.groupBy({
      by: ["projectId"],
      where: { workspaceId, projectId: { in: projectIds }, status: "Done" },
      _count: { _all: true },
    }),
    db.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true } }),
  ]);
  const taskCountMap = new Map(taskCounts.map((t) => [t.projectId, t._count._all]));
  const doneCountMap = new Map(doneCounts.map((t) => [t.projectId, t._count._all]));
  const memberIds = members.map((m) => m.userId);
  return { taskCountMap, doneCountMap, memberIds };
}

export async function GET() {
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const rows = await db.project.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
    const { taskCountMap, doneCountMap, memberIds } = await withCounts(workspaceId, rows.map((r) => r.id));

    const projects: Project[] = rows.map((row) =>
      projectToClient(row, {
        taskCount: taskCountMap.get(row.id) ?? 0,
        completedCount: doneCountMap.get(row.id) ?? 0,
        memberIds,
      })
    );

    return NextResponse.json({ projects });
  } catch (err) {
    return handleApiError(err, "GET /api/projects failed");
  }
}

interface CreateProjectBody {
  name?: string;
  description?: string;
  status?: Project["status"];
  deadline?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const body = (await req.json()) as CreateProjectBody;

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    let deadline: Date | null = null;
    if (body.deadline) {
      deadline = new Date(body.deadline);
      if (Number.isNaN(deadline.getTime())) {
        return NextResponse.json({ error: "That deadline isn't valid." }, { status: 400 });
      }
    }

    const row = await db.project.create({
      data: {
        workspaceId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        status: clientProjectStatusToDb(body.status ?? "on-track"),
        deadline,
      },
    });

    const { memberIds } = await withCounts(workspaceId, [row.id]);
    return NextResponse.json(
      { project: projectToClient(row, { taskCount: 0, completedCount: 0, memberIds }) },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err, "POST /api/projects failed");
  }
}
