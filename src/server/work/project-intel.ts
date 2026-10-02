import { db } from "@/server/db";
import type { ProjectCard } from "@/lib/work-types";

const DAY = 24 * 60 * 60 * 1000;
const STATUS_TEXT: Record<string, string> = { OnTrack: "on track", AtRisk: "at risk", Behind: "behind schedule", Completed: "completed" };

/**
 * Project intelligence for the dashboard: one batched, LLM-free pass over every active project so
 * the overview loads instantly. Each summary is derived from the project's real tasks and the
 * messages/meetings/files the context graph linked to it.
 */
export async function computeProjectOverview(workspaceId: string, userId: string): Promise<ProjectCard[]> {
  const now = new Date();
  const [projects, tasks, members] = await Promise.all([
    db.project.findMany({ where: { workspaceId, status: { not: "Completed" } }, orderBy: { updatedAt: "desc" }, take: 12 }),
    db.task.findMany({
      where: { workspaceId, projectId: { not: null } },
      select: { id: true, title: true, status: true, dueDate: true, projectId: true, assigneeId: true, blockedReason: true },
    }),
    db.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true, user: { select: { name: true, email: true } } } }),
  ]);
  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);
  const taskToProject = new Map(tasks.map((t) => [t.id, t.projectId!]));
  const links = await db.entityLink.findMany({
    where: {
      workspaceId,
      fromType: { in: ["SyncedMessage", "SyncedEvent", "SyncedFile"] },
      OR: [{ toType: "Project", toId: { in: projectIds } }, { toType: "Task", toId: { in: tasks.map((t) => t.id) } }],
    },
    select: { fromType: true, fromId: true, toType: true, toId: true },
    take: 2000,
  });
  // Synced content is private to the person whose account it came from. Projects are shared with the
  // whole workspace, so only count linked items that belong to *this* viewer - a teammate's emails or
  // files never show up here, not even as a number.
  const idsOf = (t: string) => links.filter((l) => l.fromType === t).map((l) => l.fromId);
  const [mine1, mine2, mine3] = await Promise.all([
    db.syncedMessage.findMany({ where: { workspaceId, userId, id: { in: idsOf("SyncedMessage") } }, select: { id: true } }),
    db.syncedEvent.findMany({ where: { workspaceId, userId, id: { in: idsOf("SyncedEvent") } }, select: { id: true } }),
    db.syncedFile.findMany({ where: { workspaceId, userId, id: { in: idsOf("SyncedFile") } }, select: { id: true } }),
  ]);
  const mine = new Set([...mine1, ...mine2, ...mine3].map((r) => r.id));

  const linked = new Map<string, { messages: Set<string>; meetings: Set<string>; files: Set<string> }>();
  for (const l of links) {
    if (!mine.has(l.fromId)) continue;
    const pid = l.toType === "Project" ? l.toId : taskToProject.get(l.toId);
    if (!pid) continue;
    let e = linked.get(pid);
    if (!e) linked.set(pid, (e = { messages: new Set(), meetings: new Set(), files: new Set() }));
    (l.fromType === "SyncedMessage" ? e.messages : l.fromType === "SyncedEvent" ? e.meetings : e.files).add(l.fromId);
  }

  const nameOf = (id: string) => members.find((m) => m.userId === id)?.user;
  return projects.map((p) => {
    const pt = tasks.filter((t) => t.projectId === p.id);
    const done = pt.filter((t) => t.status === "Done").length;
    const open = pt.length - done;
    const blockedTasks = pt.filter((t) => t.status === "Blocked");
    const overdue = pt.filter((t) => t.status !== "Done" && t.dueDate && t.dueDate < now).length;
    const nextOpen = pt
      .filter((t) => t.status !== "Done" && t.status !== "Blocked")
      .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))[0];
    const counts = { tasks: pt.length, open, messages: linked.get(p.id)?.messages.size ?? 0, files: linked.get(p.id)?.files.size ?? 0, meetings: linked.get(p.id)?.meetings.size ?? 0 };
    const deadlineSoon = !!p.deadline && p.deadline > now && p.deadline.getTime() - now.getTime() < 7 * DAY;
    const health: ProjectCard["health"] = p.status === "Behind" || (blockedTasks.length > 0 && p.status === "AtRisk") || overdue > 1 ? "at_risk" : p.status === "AtRisk" || blockedTasks.length > 0 || overdue > 0 || deadlineSoon ? "watch" : "healthy";

    const parts = [`${p.name} is ${STATUS_TEXT[p.status] ?? p.status}.`];
    if (pt.length) parts.push(`${done} of ${pt.length} tasks are complete.`);
    if (blockedTasks.length) parts.push(`${blockedTasks.length === 1 ? "One task is" : `${blockedTasks.length} tasks are`} blocked${blockedTasks[0].blockedReason ? ` (${blockedTasks[0].blockedReason})` : ""}.`);
    if (overdue) parts.push(`${overdue} overdue.`);
    const summary = pt.length === 0 && counts.messages === 0 ? "No tasks yet. Add tasks so STACK can track progress and spot blockers." : parts.join(" ");

    const assignees = [...new Set(pt.map((t) => t.assigneeId).filter((x): x is string => !!x))];
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      health,
      progress: pt.length ? Math.round((done / pt.length) * 100) : 0,
      deadline: p.deadline?.toISOString(),
      summary,
      people: assignees.map((id) => ({ id, name: nameOf(id)?.name ?? nameOf(id)?.email ?? "Teammate" })),
      counts,
      blockers: blockedTasks.length,
      blockerReason: blockedTasks[0]?.blockedReason ?? undefined,
      nextAction: blockedTasks.length ? `Resolve the blocker on "${blockedTasks[0].title}"` : nextOpen ? `Work on "${nextOpen.title}"` : undefined,
    };
  });
}
