import type { Task as DbTask, Project as DbProject, Subtask as DbSubtask } from "@prisma/client";
import type { Task, Project, Subtask, Priority, Person } from "@/lib/types";

const PRIORITY_TO_DB = { normal: "Medium", important: "High", urgent: "Urgent" } as const;
const PRIORITY_FROM_DB: Record<string, Priority> = { Low: "normal", Medium: "normal", High: "important", Urgent: "urgent" };

export function clientPriorityToDb(p: Priority) {
  return PRIORITY_TO_DB[p];
}

export function dbPriorityToClient(p: string): Priority {
  return PRIORITY_FROM_DB[p] ?? "normal";
}

export function taskToClient(row: DbTask & { subtasks?: DbSubtask[] }): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    done: row.status === "Done",
    priority: dbPriorityToClient(row.priority),
    projectId: row.projectId ?? undefined,
    assigneeId: row.assigneeId ?? undefined,
    dueDate: row.dueDate ? row.dueDate.toISOString() : undefined,
    labels: row.labels ?? [],
    subtasks: (row.subtasks ?? []).map((s): Subtask => ({ id: s.id, title: s.title, done: s.done })),
    source: "stack",
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    blockedReason: row.blockedReason ?? undefined,
    waitingOnId: row.waitingOnId ?? undefined,
  };
}

const PROJECT_STATUS_TO_DB = { "on-track": "OnTrack", "at-risk": "AtRisk", behind: "Behind" } as const;
const PROJECT_STATUS_FROM_DB: Record<string, Project["status"]> = {
  OnTrack: "on-track",
  AtRisk: "at-risk",
  Behind: "behind",
  Completed: "on-track",
};

export function clientProjectStatusToDb(s: Project["status"]) {
  return PROJECT_STATUS_TO_DB[s];
}

export function dbProjectStatusToClient(s: string): Project["status"] {
  return PROJECT_STATUS_FROM_DB[s] ?? "on-track";
}

const COLORS: Project["color"][] = ["blue", "yellow", "red"];
function colorForId(id: string): Project["color"] {
  const code = id.charCodeAt(id.length - 1) || 0;
  return COLORS[code % COLORS.length];
}

export function projectToClient(
  row: DbProject,
  extra: { taskCount: number; completedCount: number; memberIds: string[] }
): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    color: colorForId(row.id),
    progress: extra.taskCount > 0 ? Math.round((extra.completedCount / extra.taskCount) * 100) : 0,
    taskCount: extra.taskCount,
    completedCount: extra.completedCount,
    dueDate: row.deadline ? row.deadline.toISOString() : "",
    memberIds: extra.memberIds,
    aiSummary: undefined,
    status: dbProjectStatusToClient(row.status),
    progressHistory: undefined,
  };
}

const PERSON_COLORS: Person["color"][] = ["blue", "yellow", "red", "neutral"];
function colorForPerson(id: string): Person["color"] {
  const code = id.charCodeAt(0) || 0;
  return PERSON_COLORS[code % PERSON_COLORS.length];
}

export function memberToPerson(member: { userId: string; role: string; user: { name: string | null; email: string | null } }): Person {
  const name = member.user.name ?? member.user.email ?? "Unnamed";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return {
    id: member.userId,
    name,
    initials: initials || "?",
    role: member.role,
    color: colorForPerson(member.userId),
  };
}
