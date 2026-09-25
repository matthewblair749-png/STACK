import type { Task, Project, Message, Meeting } from "./types";

export function getOpenTasks(tasks: Task[]) {
  return tasks.filter((t) => !t.done);
}

export function getOverdueTasks(tasks: Task[]) {
  const now = Date.now();
  return tasks.filter((t) => !t.done && !!t.dueDate && new Date(t.dueDate).getTime() < now);
}

export function getUrgentOpenTasks(tasks: Task[]) {
  return tasks.filter((t) => !t.done && t.priority === "urgent");
}

export function getCompletedTasks(tasks: Task[]) {
  return tasks.filter((t) => t.done);
}

export function getProjectStatusCounts(projects: Project[]) {
  return {
    onTrack: projects.filter((p) => p.status === "on-track").length,
    atRisk: projects.filter((p) => p.status === "at-risk").length,
    behind: projects.filter((p) => p.status === "behind").length,
  };
}

export function getUnreadMessagesCount(messages: Message[]) {
  return messages.filter((m) => m.unread).length;
}

export function getMeetingsToday(meetings: Meeting[]) {
  return meetings.filter((m) => !m.time.toLowerCase().includes("tomorrow"));
}

export function getTasksDueToday(tasks: Task[]) {
  const today = new Date();
  return tasks.filter((t) => {
    if (t.done || !t.dueDate) return false;
    const d = new Date(t.dueDate);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).length;
}

export function getMessagesNeedingReply(messages: Message[]) {
  return messages.filter((m) => m.urgent && m.unread).length;
}

/** The project with the most open urgent/important tasks right now. */
export function pickFocusProject(projects: Project[], tasks: Task[]) {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (!t.done && t.projectId && (t.priority === "urgent" || t.priority === "important")) {
      counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1);
    }
  }
  let bestId: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    }
  }
  const project = bestId ? projects.find((p) => p.id === bestId) ?? null : null;
  return project ? { project, tasksNeedingAttention: bestCount } : null;
}
