import type { PendingActionKind } from "@prisma/client";

export interface CreateTaskPayload {
  title: string;
  description?: string;
  projectId?: string;
  dueDate?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
}

export interface SendSlackMessagePayload {
  channelId: string;
  text: string;
}

export interface UpdateProjectStatusPayload {
  projectId: string;
  status: "OnTrack" | "AtRisk" | "Behind" | "Completed";
}

export interface UpdateTaskPayload {
  taskId: string;
  status?: "Todo" | "InProgress" | "Blocked" | "Done";
  title?: string;
  dueDate?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  blockedReason?: string;
}

export interface CreateCalendarEventPayload {
  title: string;
  start: string;
  end: string;
  attendees?: string;
  description?: string;
}

export type ActionPayload =
  | CreateTaskPayload
  | SendEmailPayload
  | SendSlackMessagePayload
  | UpdateProjectStatusPayload
  | UpdateTaskPayload
  | CreateCalendarEventPayload;

const REQUIRED_FIELDS: Record<PendingActionKind, string[]> = {
  CreateTask: ["title"],
  SendEmail: ["to", "subject", "body"],
  SendSlackMessage: ["channelId", "text"],
  UpdateProjectStatus: ["projectId", "status"],
  UpdateTask: ["taskId"],
  CreateCalendarEvent: ["title", "start", "end"],
};

const ENUM_FIELDS: Partial<Record<PendingActionKind, Record<string, string[]>>> = {
  UpdateProjectStatus: { status: ["OnTrack", "AtRisk", "Behind", "Completed"] },
  UpdateTask: { status: ["Todo", "InProgress", "Blocked", "Done"], priority: ["Low", "Medium", "High", "Urgent"] },
  CreateTask: { priority: ["Low", "Medium", "High", "Urgent"] },
};

/** Human-readable one-line description, used by approval cards and the AI. */
export function describeAction(kind: PendingActionKind, p: Record<string, unknown>): string {
  switch (kind) {
    case "CreateTask":
      return `Create task "${p.title}"${p.dueDate ? ` due ${p.dueDate}` : ""}`;
    case "SendEmail":
      return `Send an email to ${p.to}: "${p.subject}"`;
    case "SendSlackMessage":
      return `Send a Slack message to ${p.channelId}`;
    case "UpdateProjectStatus":
      return `Set project status to ${p.status}`;
    case "UpdateTask":
      return `Update task${p.status ? ` (status: ${p.status})` : ""}${p.title ? ` "${p.title}"` : ""}`;
    case "CreateCalendarEvent":
      return `Schedule "${p.title}" at ${p.start}`;
  }
}

/**
 * Hand-rolled validation - this repo has no zod/schema-validation dependency.
 * Throws a plain Error ("Invalid payload ...") on the first missing/invalid field.
 */
export function validateActionPayload(kind: PendingActionKind, payload: unknown): ActionPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error(`Invalid payload for ${kind}: expected an object.`);
  }
  const record = payload as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS[kind]) {
    if (typeof record[field] !== "string" || record[field] === "") {
      throw new Error(`Invalid payload for ${kind}: "${field}" is required.`);
    }
  }
  for (const [field, allowed] of Object.entries(ENUM_FIELDS[kind] ?? {})) {
    const value = record[field];
    if (value !== undefined && (typeof value !== "string" || !allowed.includes(value))) {
      throw new Error(`Invalid payload for ${kind}: "${field}" must be one of ${allowed.join(", ")}.`);
    }
  }
  for (const field of ["start", "end", "dueDate"]) {
    const value = record[field];
    if (typeof value === "string" && Number.isNaN(new Date(value).getTime())) {
      throw new Error(`Invalid payload for ${kind}: "${field}" is not a valid date.`);
    }
  }
  return record as unknown as ActionPayload;
}
