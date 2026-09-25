import { db } from "@/server/db";
import { computeWorkState } from "./state";

export interface ContextRef {
  label: string;
  href?: string;
}

export interface WorkContext {
  text: string;
  /** Connected apps (provider ids) that were readable for this answer. */
  apps: string[];
  /** Every id the AI may cite, mapped to a real label + link. Anything else it cites is dropped. */
  refs: Map<string, ContextRef>;
}

const short = (s: string | null | undefined, n = 140) => (s ?? "").replace(/\s+/g, " ").slice(0, n);

/**
 * The structured contextual layer: instead of dumping raw rows at the model, present the work as
 * relationships - projects with their tasks and the messages/meetings/files the context graph
 * linked to them - plus the computed priorities and any remembered facts. Each item carries an id
 * (`task:`, `project:`, `message:`, `event:`, `file:`) so answers can cite real sources.
 */
export async function buildWorkContext(workspaceId: string, userId: string, focusProjectId?: string): Promise<WorkContext> {
  const refs = new Map<string, ContextRef>();
  const lines: string[] = [];
  const now = new Date();

  const [state, projects, tasks, members, messages, events, files, links, memory, integrations] = await Promise.all([
    computeWorkState(workspaceId, userId),
    db.project.findMany({
      where: { workspaceId, ...(focusProjectId ? { id: focusProjectId } : {}) },
      orderBy: { updatedAt: "desc" },
      take: focusProjectId ? 1 : 15,
      select: { id: true, name: true, description: true, status: true, deadline: true },
    }),
    db.task.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, title: true, status: true, priority: true, dueDate: true, projectId: true, assigneeId: true, blockedReason: true, waitingOnId: true, updatedAt: true },
    }),
    db.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true, user: { select: { name: true, email: true } } } }),
    db.syncedMessage.findMany({
      where: { workspaceId, userId },
      orderBy: { receivedAt: "desc" },
      take: 40,
      select: { id: true, provider: true, subject: true, fromName: true, snippet: true, receivedAt: true, permalink: true, threadExternalId: true },
    }),
    db.syncedEvent.findMany({
      where: { workspaceId, userId, startAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      orderBy: { startAt: "asc" },
      take: 20,
      select: { id: true, title: true, startAt: true, endAt: true, attendees: true, permalink: true },
    }),
    db.syncedFile.findMany({
      where: { workspaceId, userId },
      orderBy: { modifiedAt: "desc" },
      take: 25,
      select: { id: true, name: true, webUrl: true, modifiedAt: true },
    }),
    db.entityLink.findMany({
      where: { workspaceId, toType: { in: ["Project", "Task"] }, fromType: { in: ["SyncedMessage", "SyncedEvent", "SyncedFile"] } },
      select: { fromType: true, fromId: true, toType: true, toId: true },
      take: 500,
    }),
    db.memoryItem.findMany({ where: { workspaceId, userId }, orderBy: { updatedAt: "desc" }, take: 20, select: { key: true, value: true } }),
    db.integration.findMany({ where: { workspaceId, userId }, select: { provider: true, syncError: true } }),
  ]);

  const nameOf = (id?: string | null) => {
    const m = members.find((x) => x.userId === id);
    return m ? m.user.name ?? m.user.email ?? "someone" : undefined;
  };
  const msgById = new Map(messages.map((m) => [m.id, m]));
  const evById = new Map(events.map((e) => [e.id, e]));
  const fileById = new Map(files.map((f) => [f.id, f]));

  const reg = (key: string, label: string, href?: string | null) => {
    refs.set(key, { label, href: href ?? undefined });
    return key;
  };
  const linkedTo = (projectId: string, taskIds: Set<string>) => {
    const out = { messages: new Set<string>(), events: new Set<string>(), files: new Set<string>() };
    for (const l of links) {
      const hit = (l.toType === "Project" && l.toId === projectId) || (l.toType === "Task" && taskIds.has(l.toId));
      if (!hit) continue;
      if (l.fromType === "SyncedMessage") out.messages.add(l.fromId);
      if (l.fromType === "SyncedEvent") out.events.add(l.fromId);
      if (l.fromType === "SyncedFile") out.files.add(l.fromId);
    }
    return out;
  };
  const linkedIds = new Set<string>();

  lines.push(`NOW: ${now.toISOString()}`);
  lines.push(
    `CONNECTED APPS: ${integrations.length ? integrations.map((i) => `${i.provider}${i.syncError ? " (connection error)" : ""}`).join(", ") : "none"}. Apps not listed here are NOT connected - STACK cannot read or act in them.`,
  );

  lines.push("", "PRIORITIES (STACK's own ranking, with the reasons):");
  if (state.priorities.length === 0) lines.push("- none");
  for (const p of state.priorities) {
    const first = p.refs[0];
    const key = first ? reg(`${first.type === "SyncedMessage" ? "message" : first.type === "SyncedEvent" ? "event" : "task"}:${first.id}`, first.label, first.href) : undefined;
    lines.push(`- ${key ? `[${key}] ` : ""}${p.title} | why: ${p.why.join(" ")} | next: ${p.nextStep}`);
  }

  lines.push("", "PROJECTS (each with its tasks and the content linked to it):");
  if (projects.length === 0) lines.push("- none");
  for (const p of projects) {
    const pKey = reg(`project:${p.id}`, p.name, `/projects/${p.id}`);
    const pt = tasks.filter((t) => t.projectId === p.id);
    const done = pt.filter((t) => t.status === "Done").length;
    lines.push(`- [${pKey}] ${p.name} - status ${p.status}, ${done}/${pt.length} tasks done${p.deadline ? `, deadline ${p.deadline.toISOString().slice(0, 10)}` : ""}${p.description ? ` - ${short(p.description, 120)}` : ""}`);
    for (const t of pt.slice(0, 12)) {
      const tKey = reg(`task:${t.id}`, t.title, "/tasks");
      lines.push(
        `    task [${tKey}] "${t.title}" ${t.status}${t.dueDate ? ` due ${t.dueDate.toISOString().slice(0, 10)}` : ""}${t.blockedReason ? ` BLOCKED: ${t.blockedReason}` : ""}${t.waitingOnId ? ` waiting on ${nameOf(t.waitingOnId) ?? "someone"}` : ""}${t.assigneeId ? ` assignee ${nameOf(t.assigneeId) ?? "?"}` : ""}`,
      );
    }
    const linked = linkedTo(p.id, new Set(pt.map((t) => t.id)));
    for (const id of linked.messages) {
      const m = msgById.get(id);
      if (!m) continue;
      linkedIds.add(id);
      lines.push(`    message [${reg(`message:${m.id}`, m.subject ?? "Message", m.permalink)}] from ${m.fromName ?? "?"}: "${short(m.subject, 80)}" - ${short(m.snippet, 160)} (${m.receivedAt.toISOString().slice(0, 10)})`);
    }
    for (const id of linked.events) {
      const e = evById.get(id);
      if (!e) continue;
      linkedIds.add(id);
      lines.push(`    meeting [${reg(`event:${e.id}`, e.title, e.permalink)}] "${e.title}" ${e.startAt.toISOString()}`);
    }
    for (const id of linked.files) {
      const f = fileById.get(id);
      if (!f) continue;
      linkedIds.add(id);
      lines.push(`    file [${reg(`file:${f.id}`, f.name, f.webUrl)}] "${f.name}" modified ${f.modifiedAt.toISOString().slice(0, 10)}`);
    }
  }

  const loose = tasks.filter((t) => !t.projectId).slice(0, 15);
  if (loose.length && !focusProjectId) {
    lines.push("", "TASKS WITHOUT A PROJECT:");
    for (const t of loose) {
      lines.push(`- [${reg(`task:${t.id}`, t.title, "/tasks")}] "${t.title}" ${t.status}${t.dueDate ? ` due ${t.dueDate.toISOString().slice(0, 10)}` : ""}${t.blockedReason ? ` BLOCKED: ${t.blockedReason}` : ""}`);
    }
  }

  if (!focusProjectId) {
    lines.push("", "OTHER RECENT MESSAGES (not linked to a project):");
    const others = messages.filter((m) => !linkedIds.has(m.id)).slice(0, 15);
    if (others.length === 0) lines.push("- none");
    for (const m of others) {
      lines.push(`- [${reg(`message:${m.id}`, m.subject ?? "Message", m.permalink)}] via ${m.provider} from ${m.fromName ?? "?"}: "${short(m.subject, 80)}" - ${short(m.snippet, 160)} (${m.receivedAt.toISOString().slice(0, 10)}${m.provider === "slack" && m.threadExternalId ? `, slack channelId ${m.threadExternalId}` : ""})`);
    }
    lines.push("", "CALENDAR:");
    const otherEvents = events.filter((e) => !linkedIds.has(e.id));
    if (otherEvents.length === 0) lines.push("- none");
    for (const e of otherEvents) {
      lines.push(`- [${reg(`event:${e.id}`, e.title, e.permalink)}] "${e.title}" ${e.startAt.toISOString()} - ${e.endAt.toISOString()}${e.attendees.length ? ` with ${e.attendees.slice(0, 6).join(", ")}` : ""}`);
    }
    lines.push("", "RECENT FILES:");
    const otherFiles = files.filter((f) => !linkedIds.has(f.id)).slice(0, 12);
    if (otherFiles.length === 0) lines.push("- none");
    for (const f of otherFiles) {
      lines.push(`- [${reg(`file:${f.id}`, f.name, f.webUrl)}] "${f.name}" modified ${f.modifiedAt.toISOString().slice(0, 10)}`);
    }
  }

  lines.push("", "PEOPLE IN THIS WORKSPACE:");
  for (const m of members) lines.push(`- ${m.user.name ?? m.user.email}${m.user.email ? ` <${m.user.email}>` : ""}`);

  if (memory.length) {
    lines.push("", "REMEMBERED CONTEXT (facts STACK has noticed; the user can delete any of them):");
    for (const m of memory) lines.push(`- ${m.key}: ${short(JSON.stringify(m.value), 160)}`);
  }

  return { text: lines.join("\n"), refs, apps: integrations.filter((i) => !i.syncError).map((i) => i.provider) };
}
