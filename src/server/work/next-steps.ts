import { db } from "@/server/db";

const DAY = 24 * 60 * 60 * 1000;

interface DoneTask {
  id: string;
  title: string;
  projectId: string | null;
  workspaceId: string;
}

async function addNextStep(workspaceId: string, userId: string, dedupeKey: string, title: string, body: string, subjectId: string) {
  const existing = await db.insight.findUnique({ where: { workspaceId_userId_dedupeKey: { workspaceId, userId, dedupeKey } } });
  if (existing) return false;
  await db.insight.create({
    data: { workspaceId, userId, level: "Important", category: "next_step", title, body, subjectType: "Task", subjectId, dedupeKey, status: "Open" },
  });
  return true;
}

/**
 * The "Move Forward" step: when a task is finished, work out what naturally happens next from
 * real data - the next open task in the project, a linked meeting that is coming up, a linked
 * message still waiting for a reply. Persisted as deduped Insights so they show up on the
 * dashboard and are visible to the AI. Suggestions only; nothing is executed.
 */
export async function suggestNextSteps(task: DoneTask, userId: string): Promise<number> {
  const { workspaceId } = task;
  const now = new Date();
  let added = 0;

  if (task.projectId) {
    const [project, siblings] = await Promise.all([
      db.project.findUnique({ where: { id: task.projectId }, select: { name: true } }),
      db.task.findMany({
        where: { workspaceId, projectId: task.projectId, status: { not: "Done" }, id: { not: task.id } },
        orderBy: [{ dueDate: "asc" }],
        take: 3,
        select: { id: true, title: true, status: true, blockedReason: true },
      }),
    ]);
    const next = siblings.find((s) => s.status !== "Blocked");
    if (project && next) {
      if (await addNextStep(workspaceId, userId, `nextstep:${task.id}:sibling`, `Next in ${project.name}: "${next.title}"`, `"${task.title}" is done. This is the next open task in ${project.name}.`, next.id)) added++;
    } else if (project && siblings.length === 0) {
      if (await addNextStep(workspaceId, userId, `nextstep:project:${task.projectId}:complete`, `${project.name} has no open tasks left`, `"${task.title}" was the last open task. Consider marking the project completed.`, task.id)) added++;
    } else if (project && siblings.length > 0) {
      const blocked = siblings[0];
      if (await addNextStep(workspaceId, userId, `nextstep:${task.id}:blocked`, `${project.name} is waiting on a blocker`, `Only blocked work remains: "${blocked.title}"${blocked.blockedReason ? ` (${blocked.blockedReason})` : ""}. Resolve it to keep the project moving.`, blocked.id)) added++;
    }
  }

  // Real content linked to this task or its project through the context graph.
  const links = await db.entityLink.findMany({
    where: {
      workspaceId,
      OR: [
        { toType: "Task", toId: task.id },
        ...(task.projectId ? [{ toType: "Project" as const, toId: task.projectId }] : []),
      ],
      fromType: { in: ["SyncedEvent", "SyncedMessage"] },
    },
    select: { fromType: true, fromId: true },
  });
  const eventIds = links.filter((l) => l.fromType === "SyncedEvent").map((l) => l.fromId);
  const messageIds = links.filter((l) => l.fromType === "SyncedMessage").map((l) => l.fromId);

  if (eventIds.length) {
    const events = await db.syncedEvent.findMany({
      where: { workspaceId, userId, id: { in: eventIds }, startAt: { gte: now, lte: new Date(now.getTime() + 3 * DAY) } },
      orderBy: { startAt: "asc" },
      take: 1,
      select: { id: true, title: true, startAt: true },
    });
    for (const e of events) {
      const when = e.startAt.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
      if (await addNextStep(workspaceId, userId, `nextstep:${task.id}:event:${e.id}`, `Share "${task.title}" before "${e.title}"`, `"${task.title}" is finished and "${e.title}" is ${when}. Next step: make sure the right people have it before then.`, task.id)) added++;
    }
  }
  if (messageIds.length) {
    const messages = await db.syncedMessage.findMany({
      where: { workspaceId, userId, id: { in: messageIds }, receivedAt: { gte: new Date(now.getTime() - 5 * DAY) } },
      orderBy: { receivedAt: "desc" },
      take: 1,
      select: { id: true, subject: true, fromName: true },
    });
    for (const m of messages) {
      if (await addNextStep(workspaceId, userId, `nextstep:${task.id}:message:${m.id}`, `Reply to ${m.fromName ?? "them"} with the result`, `"${task.title}" is done and "${m.subject ?? "their message"}" is related. Let ${m.fromName ?? "them"} know.`, task.id)) added++;
    }
  }
  return added;
}
