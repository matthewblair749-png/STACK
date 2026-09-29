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
