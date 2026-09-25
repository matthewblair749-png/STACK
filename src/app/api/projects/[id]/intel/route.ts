import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { buildWorkContext } from "@/server/work/context";

const STALE_MS = 12 * 60 * 60 * 1000;
const STATUS_TEXT: Record<string, string> = { OnTrack: "on track", AtRisk: "at risk", Behind: "behind schedule", Completed: "completed" };

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const project = await db.project.findFirst({ where: { id, workspaceId } });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const [tasks, members] = await Promise.all([
      db.task.findMany({
        where: { workspaceId, projectId: id },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        select: { id: true, title: true, status: true, priority: true, dueDate: true, assigneeId: true, blockedReason: true, waitingOnId: true, updatedAt: true },
      }),
      db.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true, user: { select: { name: true, email: true } } } }),
    ]);
    const nameOf = (uid?: string | null) => {
      const m = members.find((x) => x.userId === uid);
      return m ? m.user.name ?? m.user.email ?? "Unnamed" : undefined;
    };

    const links = await db.entityLink.findMany({
      where: {
        workspaceId,
        fromType: { in: ["SyncedMessage", "SyncedEvent", "SyncedFile"] },
        OR: [{ toType: "Project", toId: id }, ...(tasks.length ? [{ toType: "Task" as const, toId: { in: tasks.map((t) => t.id) } }] : [])],
      },
      select: { fromType: true, fromId: true },
    });
    const ids = (t: string) => links.filter((l) => l.fromType === t).map((l) => l.fromId);
    const [messages, meetings, files] = await Promise.all([
      db.syncedMessage.findMany({ where: { workspaceId, userId: session.user.id, id: { in: ids("SyncedMessage") } }, orderBy: { receivedAt: "desc" }, take: 8, select: { id: true, subject: true, fromName: true, snippet: true, receivedAt: true, permalink: true } }),
      db.syncedEvent.findMany({ where: { workspaceId, userId: session.user.id, id: { in: ids("SyncedEvent") } }, orderBy: { startAt: "desc" }, take: 8, select: { id: true, title: true, startAt: true, permalink: true } }),
      db.syncedFile.findMany({ where: { workspaceId, userId: session.user.id, id: { in: ids("SyncedFile") } }, orderBy: { modifiedAt: "desc" }, take: 8, select: { id: true, name: true, webUrl: true, modifiedAt: true } }),
    ]);

    const completed = tasks.filter((t) => t.status === "Done").length;
    const blockers = tasks.filter((t) => t.status === "Blocked").map((t) => ({ taskId: t.id, title: t.title, reason: t.blockedReason ?? undefined }));
    const waiting = tasks
      .filter((t) => t.status !== "Done" && t.waitingOnId)
      .map((t) => ({ taskId: t.id, title: t.title, waitingOn: nameOf(t.waitingOnId), owner: nameOf(t.assigneeId) }));
    const now = new Date();
    const deadlines = [
      ...(project.deadline ? [{ title: `${project.name} deadline`, due: project.deadline.toISOString(), kind: "project" as const }] : []),
      ...tasks.filter((t) => t.status !== "Done" && t.dueDate).map((t) => ({ title: t.title, due: t.dueDate!.toISOString(), kind: "task" as const })),
    ]
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 8);
    const overdue = deadlines.filter((d) => d.kind === "task" && new Date(d.due) < now).length;
    const nextOpen = tasks.find((t) => t.status !== "Done" && t.status !== "Blocked");

    // Always-available, fully derived overview; replaced by an AI-written one when configured.
    const parts = [`${project.name} is ${STATUS_TEXT[project.status] ?? project.status}.`, `${completed} of ${tasks.length} tasks are complete.`];
    if (blockers.length) parts.push(`${blockers.length} ${blockers.length === 1 ? "task is" : "tasks are"} blocked${blockers[0].reason ? ` (${blockers[0].reason})` : ""}.`);
    if (overdue) parts.push(`${overdue} ${overdue === 1 ? "task is" : "tasks are"} overdue.`);
    if (messages.length || meetings.length) parts.push(`STACK found ${messages.length} related ${messages.length === 1 ? "message" : "messages"} and ${meetings.length} related ${meetings.length === 1 ? "meeting" : "meetings"}.`);
    if (blockers.length) parts.push(`Recommended next step: resolve the blocker on "${blockers[0].title}" first.`);
    else if (nextOpen) parts.push(`Recommended next step: "${nextOpen.title}".`);
    const computed = tasks.length === 0 && messages.length === 0 ? `${project.name} has no tasks yet. Add tasks so STACK can track progress and spot blockers.` : parts.join(" ");

    let summary = { text: computed, source: "computed" as "computed" | "ai", updatedAt: undefined as string | undefined };
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    const fresh = project.summary && project.summaryUpdatedAt && now.getTime() - project.summaryUpdatedAt.getTime() < STALE_MS;
    if (project.summary && fresh && !refresh) {
      summary = { text: project.summary, source: "ai", updatedAt: project.summaryUpdatedAt!.toISOString() };
    } else if (process.env.ANTHROPIC_API_KEY && (tasks.length > 0 || messages.length > 0)) {
      try {
        const context = await buildWorkContext(workspaceId, session.user.id, id);
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const res = await client.messages.create({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
          max_tokens: 300,
          system:
            "Write a 2-4 sentence overview of this project for the person who owns it. State whether it is progressing, what is blocking it, what recently changed, and the single recommended next step. Use ONLY the data given; never invent details. Plain text, no markdown.\n\n" +
            context.text,
          messages: [{ role: "user", content: "Summarize this project." }],
        });
        const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
        if (text) {
          await db.project.update({ where: { id }, data: { summary: text, summaryUpdatedAt: now } });
          summary = { text, source: "ai", updatedAt: now.toISOString() };
        }
      } catch (err) {
        console.error("project summary generation failed", err);
      }
    }

    return NextResponse.json({
      project: { id: project.id, name: project.name, description: project.description ?? "", status: project.status, deadline: project.deadline?.toISOString() },
      summary,
      progress: { completed, total: tasks.length },
      tasks: tasks.map((t) => ({ ...t, dueDate: t.dueDate?.toISOString(), updatedAt: t.updatedAt.toISOString(), assignee: nameOf(t.assigneeId), waitingOn: nameOf(t.waitingOnId) })),
      blockers,
      waiting,
      people: members.filter((m) => tasks.some((t) => t.assigneeId === m.userId)).map((m) => ({ id: m.userId, name: m.user.name ?? m.user.email ?? "Unnamed" })),
      messages: messages.map((m) => ({ ...m, receivedAt: m.receivedAt.toISOString() })),
      meetings: meetings.map((m) => ({ ...m, startAt: m.startAt.toISOString() })),
      files: files.map((f) => ({ ...f, modifiedAt: f.modifiedAt.toISOString() })),
      deadlines,
      nextStep: blockers[0] ? `Resolve the blocker on "${blockers[0].title}".` : nextOpen ? `Work on "${nextOpen.title}".` : undefined,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/projects/[id]/intel failed");
  }
}
