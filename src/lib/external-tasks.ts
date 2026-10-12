import type { SourceApp, Task } from "./types";

/** A task synced with its real fields (Asana, Jira, Linear), as returned by /api/synced/tasks. */
export interface SyncedTaskItem {
  id: string;
  provider: string;
  title: string;
  status: string | null;
  priority: string | null;
  container: string | null;
  dueAt: string | null;
  /** The app gave a date without a time: the task is due that whole day. */
  dueIsDate: boolean;
  permalink: string | null;
  updatedAt: string;
}

/** YYYY-MM-DD in the viewer's own time zone. */
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Turns a task synced with its real fields into a read-only My Work row. Status, due date and priority come from
 * the app itself; urgency is only raised for an overdue task or the app's own top priorities.
 */
export function syncedTaskToTask(item: SyncedTaskItem, now = new Date()): Task {
  const dueDay = item.dueAt?.slice(0, 10);
  const dueDate = item.dueAt ? (item.dueIsDate ? `${dueDay}T12:00:00` : item.dueAt) : undefined;
  const overdue = item.dueAt ? (item.dueIsDate ? dueDay! < localDay(now) : new Date(item.dueAt) < now) : false;
  const p = (item.priority ?? "").toLowerCase();
  const priority = overdue || /\b(urgent|highest|critical|blocker)\b/.test(p) ? "urgent" : /\bhigh\b/.test(p) ? "important" : "normal";
  const url = item.permalink && /^https?:\/\//i.test(item.permalink) ? item.permalink : undefined;
  return {
    id: `ext:${item.id}`,
    title: item.title,
    description: [item.status, item.priority ? `${item.priority} priority` : null].filter(Boolean).join(" - ") || undefined,
    done: false,
    priority,
    dueDate,
    labels: item.status ? [item.status] : [],
    subtasks: [],
    source: item.provider as SourceApp,
    createdAt: item.updatedAt,
    external: { provider: item.provider, url, container: item.container ?? undefined },
  };
}
