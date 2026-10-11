import type { SourceApp, Task } from "./types";

/** A synced item from a task app (Asana, Jira, Linear, GitHub, ...), as returned by /api/synced/messages. */
export interface SyncedWorkItem {
  id: string;
  provider: string;
  subject: string | null;
  fromName: string | null;
  snippet: string;
  receivedAt: string;
  permalink: string | null;
}

const DUE = /\b(overdue since|due)\s+(\d{4}-\d{2}-\d{2})/i;

/**
 * Turns an item synced from a task app into a read-only My Work row. The apps only give STACK a text
 * summary, so due date and urgency are read from it; anything not stated is left out rather than guessed.
 */
export function externalToTask(item: SyncedWorkItem): Task {
  const text = item.snippet ?? "";
  const due = text.match(DUE);
  const overdue = !!due && due[1].toLowerCase() === "overdue since";
  const urgent = overdue || /\burgent\b/i.test(text);
  const important = /\b(high|review requested|approval requested|mention)/i.test(text);
  const url = item.permalink && /^https?:\/\//i.test(item.permalink) ? item.permalink : undefined;

  return {
    id: `ext:${item.id}`,
    title: item.subject?.trim() || "(untitled)",
    description: text || undefined,
    done: false,
    priority: urgent ? "urgent" : important ? "important" : "normal",
    dueDate: due ? `${due[2]}T12:00:00` : undefined,
    labels: [],
    subtasks: [],
    source: item.provider as SourceApp,
    createdAt: item.receivedAt,
    external: { provider: item.provider, url, container: item.fromName ?? undefined },
  };
}

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
