import type { PendingAction } from "@prisma/client";
import { db } from "@/server/db";
import { getFreshTokens } from "@/server/integrations/tokens";
import type {
  CreateCalendarEventPayload, CreateTaskPayload, SendEmailPayload, SendSlackMessagePayload,
  UpdateProjectStatusPayload, UpdateTaskPayload,
} from "./types";

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Old Google connections were granted read-only scopes; writes need an explicit re-consent. */
function requireScope(scopes: string[], needed: string[], what: string) {
  if (!scopes.some((s) => needed.some((n) => s.endsWith(n)))) {
    throw new Error(`STACK doesn't have permission to ${what} yet. Grant it at /api/integrations/google/connect?write=1 (opens Google's consent screen), then approve again.`);
  }
}

async function executeCreateTask(action: PendingAction): Promise<Record<string, unknown>> {
  const payload = action.payload as unknown as CreateTaskPayload;
  const task = await db.task.create({
    data: {
      workspaceId: action.workspaceId,
      creatorId: action.userId,
      assigneeId: action.userId,
      title: payload.title,
      description: payload.description,
      projectId: payload.projectId,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
      priority: payload.priority ?? "Medium",
    },
  });
  return { taskId: task.id };
}

async function executeUpdateTask(action: PendingAction): Promise<Record<string, unknown>> {
  const p = action.payload as unknown as UpdateTaskPayload;
  const existing = await db.task.findFirst({ where: { id: p.taskId, workspaceId: action.workspaceId } });
  if (!existing) throw new Error("That task no longer exists.");
  const task = await db.task.update({
    where: { id: existing.id },
    data: {
      ...(p.status ? { status: p.status } : {}),
      ...(p.title ? { title: p.title } : {}),
      ...(p.dueDate ? { dueDate: new Date(p.dueDate) } : {}),
      ...(p.priority ? { priority: p.priority } : {}),
      ...(p.status === "Blocked" ? { blockedReason: p.blockedReason ?? null } : p.status ? { blockedReason: null } : {}),
    },
  });
  return { taskId: task.id, status: task.status };
}

async function executeUpdateProjectStatus(action: PendingAction): Promise<Record<string, unknown>> {
  const p = action.payload as unknown as UpdateProjectStatusPayload;
  const existing = await db.project.findFirst({ where: { id: p.projectId, workspaceId: action.workspaceId } });
  if (!existing) throw new Error("That project no longer exists.");
  const project = await db.project.update({ where: { id: existing.id }, data: { status: p.status } });
  return { projectId: project.id, status: project.status };
}

async function executeSendEmail(action: PendingAction): Promise<Record<string, unknown>> {
  const payload = action.payload as unknown as SendEmailPayload;
  const tokens = await getFreshTokens(action.workspaceId, action.userId, "google");
  requireScope(tokens.scopes, ["/auth/gmail.send", "/auth/gmail.modify", "mail.google.com/"], "send email");
  const raw = base64url(
    `To: ${payload.to}\r\nSubject: ${payload.subject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${payload.body}`
  );
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { gmailMessageId: data.id };
}

async function executeCreateCalendarEvent(action: PendingAction): Promise<Record<string, unknown>> {
  const p = action.payload as unknown as CreateCalendarEventPayload;
  const tokens = await getFreshTokens(action.workspaceId, action.userId, "google");
  requireScope(tokens.scopes, ["/auth/calendar", "/auth/calendar.events"], "create calendar events");
  const attendees = (p.attendees ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: p.title,
      description: p.description,
      start: { dateTime: new Date(p.start).toISOString() },
      end: { dateTime: new Date(p.end).toISOString() },
      ...(attendees.length ? { attendees } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Google Calendar create failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { calendarEventId: data.id, link: data.htmlLink };
}

async function executeSendSlackMessage(action: PendingAction): Promise<Record<string, unknown>> {
  const payload = action.payload as unknown as SendSlackMessagePayload;
  const tokens = await getFreshTokens(action.workspaceId, action.userId, "slack");
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: payload.channelId, text: payload.text }),
  });
  const data = await res.json();
  if (data.ok !== true) throw new Error(`Slack chat.postMessage failed: ${data.error ?? "unknown_error"}`);
  return { slackMessageTs: data.ts };
}

/**
 * Executes an already-approved PendingAction. Callers must have already
 * atomically claimed the row (status Pending -> Executed) before calling
 * this, so it never runs twice for the same approval click.
 */
export async function executePendingAction(action: PendingAction): Promise<Record<string, unknown>> {
  switch (action.kind) {
    case "CreateTask":
      return executeCreateTask(action);
    case "UpdateTask":
      return executeUpdateTask(action);
    case "UpdateProjectStatus":
      return executeUpdateProjectStatus(action);
    case "SendEmail":
      return executeSendEmail(action);
    case "CreateCalendarEvent":
      return executeCreateCalendarEvent(action);
    case "SendSlackMessage":
      return executeSendSlackMessage(action);
    default:
      throw new Error(`Unknown action kind: ${action.kind}`);
  }
}
