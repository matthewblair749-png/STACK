import { createHash } from "crypto";
import type { PendingAction } from "@prisma/client";
import { db } from "@/server/db";
import { ActionError, providerWrite, rejectedBy } from "./errors";
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
    throw new ActionError(`STACK doesn't have permission to ${what} yet. Grant it at /api/integrations/google/connect?write=1 (opens Google's consent screen), then approve again. Nothing was sent.`, "not_done");
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
  const res = await providerWrite("Gmail", "send the email", "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) await rejectedBy("Gmail", "send the email", res);
  // Gmail said it was sent; an unreadable body doesn't undo that.
  const data = await res.json().catch(() => ({}));
  return { gmailMessageId: data.id ?? null };
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
  // A fixed event id per action makes a repeated attempt land on the same event instead of creating a second one.
  // Google allows client ids made of base32hex characters (a-v, 0-9); a hex digest only uses 0-9 and a-f.
  const eventId = calendarEventIdFor(action.id);
  const headers = { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" };
  const res = await providerWrite("Google Calendar", "create the meeting", "https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: eventId,
      summary: p.title,
      description: p.description,
      start: { dateTime: new Date(p.start).toISOString() },
      end: { dateTime: new Date(p.end).toISOString() },
      ...(attendees.length ? { attendees } : {}),
    }),
  });
  if (res.status === 409) {
    // That id already exists - most likely an earlier attempt that did get through. Only call it done once Google
    // confirms the event is really there.
    const check = await providerWrite("Google Calendar", "create the meeting", `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, { headers });
    if (!check.ok) await rejectedBy("Google Calendar", "create the meeting", res);
    const existing = await check.json().catch(() => ({}));
    return { calendarEventId: eventId, link: existing.htmlLink ?? null, alreadyExisted: true };
  }
  if (!res.ok) await rejectedBy("Google Calendar", "create the meeting", res);
  const data = await res.json().catch(() => ({}));
  return { calendarEventId: data.id ?? eventId, link: data.htmlLink ?? null };
}

async function executeSendSlackMessage(action: PendingAction): Promise<Record<string, unknown>> {
  const payload = action.payload as unknown as SendSlackMessagePayload;
  const tokens = await getFreshTokens(action.workspaceId, action.userId, "slack");
  const res = await providerWrite("Slack", "post the message", "https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: payload.channelId, text: payload.text }),
  });
  if (!res.ok) await rejectedBy("Slack", "post the message", res);
  const data = await res.json().catch(() => null);
  if (!data) throw new ActionError("Slack's answer couldn't be read, so STACK can't confirm whether it managed to post the message. Check Slack before trying again.", "unknown");
  // Slack answers 200 with ok:false when it refused - the message was not posted.
  if (data.ok !== true) throw new ActionError(`Couldn't post the message: Slack said "${data.error ?? "unknown_error"}". Nothing was posted.`, "not_done");
  return { slackMessageTs: data.ts };
}

/** Google Calendar event id for an action: stable, unique per action, and only base32hex characters. */
export function calendarEventIdFor(actionId: string): string {
  return createHash("sha256").update(`stack-action:${actionId}`).digest("hex");
}

/**
 * Executes an already-approved PendingAction. Callers must have already
 * atomically claimed the row (status Pending -> Approved) before calling
 * this, so it never runs twice for the same approval click. Resolves only
 * when the app (or STACK's database) confirmed the change; otherwise throws,
 * with an ActionError saying whether anything might have happened.
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
