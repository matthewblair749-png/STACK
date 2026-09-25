import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { taskToClient, clientPriorityToDb } from "@/server/mappers";
import type { Priority } from "@/lib/types";

export async function GET() {
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const rows = await db.task.findMany({
      where: { workspaceId },
      include: { subtasks: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tasks: rows.map(taskToClient) });
  } catch (err) {
    return handleApiError(err, "GET /api/tasks failed");
  }
}

interface CreateTaskBody {
  title?: string;
  description?: string;
  priority?: Priority;
  projectId?: string;
  assigneeId?: string;
  dueDate?: string;
  labels?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = (await req.json()) as CreateTaskBody;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    let dueDate: Date | null = null;
    if (body.dueDate) {
      dueDate = new Date(body.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return NextResponse.json({ error: "That due date isn't valid." }, { status: 400 });
      }
    }

    if (body.projectId) {
      const project = await db.project.findFirst({ where: { id: body.projectId, workspaceId } });
      if (!project) {
        return NextResponse.json({ error: "That project doesn't exist in this workspace." }, { status: 400 });
      }
    }
    if (body.assigneeId) {
      const member = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: body.assigneeId } },
      });
      if (!member) {
        return NextResponse.json({ error: "That person isn't a member of this workspace." }, { status: 400 });
      }
    }

    const row = await db.task.create({
      data: {
        workspaceId,
        creatorId: session.user.id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        priority: clientPriorityToDb(body.priority ?? "normal"),
        projectId: body.projectId || null,
        assigneeId: body.assigneeId || null,
        dueDate,
        labels: body.labels ?? [],
      },
      include: { subtasks: true },
    });

    return NextResponse.json({ task: taskToClient(row) }, { status: 201 });
  } catch (err) {
    return handleApiError(err, "POST /api/tasks failed");
  }
}
