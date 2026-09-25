import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { taskToClient, clientPriorityToDb } from "@/server/mappers";
import { suggestNextSteps } from "@/server/work/next-steps";
import type { Priority, Subtask } from "@/lib/types";

const STATUSES = ["Todo", "InProgress", "Blocked", "Done"] as const;

interface UpdateTaskBody {
  title?: string;
  description?: string;
  done?: boolean;
  priority?: Priority;
  projectId?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  labels?: string[];
  subtasks?: Subtask[];
  status?: (typeof STATUSES)[number];
  blockedReason?: string | null;
  waitingOnId?: string | null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const existing = await db.task.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const body = (await req.json()) as UpdateTaskBody;
    if (body.status !== undefined && !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "That status isn't valid." }, { status: 400 });
    }
    if (body.waitingOnId) {
      const waitingOn = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: body.waitingOnId } },
      });
      if (!waitingOn) {
        return NextResponse.json({ error: "That person isn't a member of this workspace." }, { status: 400 });
      }
    }
    const nextStatus = body.status ?? (body.done !== undefined ? (body.done ? "Done" : "Todo") : undefined);

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

    let dueDate: Date | null | undefined = undefined;
    if (body.dueDate !== undefined) {
      dueDate = body.dueDate ? new Date(body.dueDate) : null;
      if (dueDate && Number.isNaN(dueDate.getTime())) {
        return NextResponse.json({ error: "That due date isn't valid." }, { status: 400 });
      }
    }

    if (body.subtasks) {
      await db.subtask.deleteMany({ where: { taskId: id } });
    }

    const row = await db.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(nextStatus !== undefined ? { status: nextStatus } : {}),
        ...(nextStatus !== undefined && nextStatus !== "Blocked" ? { blockedReason: null } : {}),
        ...(nextStatus === "Blocked" && body.blockedReason !== undefined ? { blockedReason: body.blockedReason?.trim() || null } : {}),
        ...(body.waitingOnId !== undefined ? { waitingOnId: body.waitingOnId || null } : {}),
        ...(body.priority !== undefined ? { priority: clientPriorityToDb(body.priority) } : {}),
        ...(body.projectId !== undefined ? { projectId: body.projectId || null } : {}),
        ...(body.assigneeId !== undefined ? { assigneeId: body.assigneeId || null } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(body.labels !== undefined ? { labels: body.labels } : {}),
        ...(body.subtasks
          ? { subtasks: { create: body.subtasks.map((s) => ({ title: s.title, done: s.done })) } }
          : {}),
      },
      include: { subtasks: true },
    });

    if (existing.status !== "Done" && row.status === "Done") {
      // Move Forward: work out what happens next. Best-effort - never fail the completion itself.
      await suggestNextSteps({ id: row.id, title: row.title, projectId: row.projectId, workspaceId }, session.user.id).catch((e) =>
        console.error("suggestNextSteps failed", e),
      );
    }

    return NextResponse.json({ task: taskToClient(row) });
  } catch (err) {
    return handleApiError(err, "PATCH /api/tasks/[id] failed");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { workspaceId } = await requireSessionAndWorkspace();
    const existing = await db.task.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    await db.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/tasks/[id] failed");
  }
}
