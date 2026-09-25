import { db } from "@/server/db";
import { validateActionPayload } from "@/server/actions/types";
import type { AiFinding, StructuredAnswer } from "@/lib/work-types";
import type { AskEvent, AskResult, UsedSources } from "./run";

/**
 * STACK's built-in basic assistant. No AI model and no cost: it understands a fixed set of questions
 * (priorities, meetings, email, tasks, projects, search, "create a task ...") and answers them straight
 * from the user's real synced data. It never invents anything - if the data doesn't have an answer it
 * says so. Used when no Anthropic key/credits are available, so chat always works.
 */

const DAY = 24 * 60 * 60 * 1000;
const STOP = new Set("the a an and or of to in on for with about my me i is are was what whats which who when where how do does did find search show tell give any all from that this it be can you please look up get".split(" "));

const when = (d: Date) => d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const trim = (s: string | null | undefined, n = 110) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

type Intent = "help" | "priorities" | "meetings" | "email" | "tasks" | "projects" | "create_task" | "search";

function detect(q: string): { intent: Intent; arg?: string } {
  const text = q.trim();
  const lower = text.toLowerCase();
  const create = text.match(/^(?:please\s+)?(?:create|add|make|new)\s+(?:a\s+|an\s+)?(?:new\s+)?task(?:\s+(?:to|called|named|for|:))?\s*:?\s*(.+)$/i);
  if (create?.[1]) return { intent: "create_task", arg: create[1].trim() };
  if (/^(hi|hello|hey|help|what can you do|who are you)\b/.test(lower)) return { intent: "help" };
  if (/\b(priorit\w*|what matters|focus|important|urgent|most pressing|what should i (do|work)|today)\b/.test(lower)) return { intent: "priorities" };
  if (/\b(meeting|calendar|schedule|event|agenda|call)s?\b/.test(lower) && !/\b(find|search)\b/.test(lower)) return { intent: "meetings" };
  if (/\b(email|emails|inbox|unread|message|messages|mail|waiting on|reply|respond)\b/.test(lower) && !/\b(find|search)\b/.test(lower)) return { intent: "email" };
  if (/\b(task|tasks|to-?do|due|overdue|deadline)s?\b/.test(lower)) return { intent: "tasks" };
  if (/\b(project|projects|at risk|behind|on track)\b/.test(lower)) return { intent: "projects" };
  return { intent: "search", arg: text };
}

export async function runLocalAsk(opts: {
  workspaceId: string;
  userId: string;
  question: string;
  projectId?: string;
  reason?: string;
  emit?: (e: AskEvent) => void;
}): Promise<AskResult> {
  const { workspaceId, userId, question, emit } = opts;
  emit?.({ type: "step", label: "Reading your work" });

  const integrations = await db.integration.findMany({ where: { workspaceId, userId }, select: { provider: true } });
  const used: UsedSources = { apps: integrations.map((i) => i.provider), items: [] };
  emit?.({ type: "context", used });

  const findings: AiFinding[] = [];
  const actions: { label: string; href: string }[] = [];
  const pendingActions: AskResult["pendingActions"] = [];
  let headline = "";
  let nextStep: string | undefined;

  const cite = (type: string, label: string, href?: string) => {
    if (!used.items.some((i) => i.type === type && i.label === label)) used.items.push({ type, label, href });
    return { label, href };
  };
  const now = new Date();
  const { intent, arg } = detect(question);
  emit?.({ type: "step", label: "Looking through your synced data" });

  const noApps = integrations.length === 0;

  if (intent === "help") {
    headline = "I'm STACK's built-in assistant. I can answer from your real, synced work.";
    findings.push(
      { title: "Ask about your work", detail: "\"What are my priorities?\", \"What meetings do I have?\", \"Any unread email?\", \"What tasks are due?\", \"Which projects are at risk?\"" },
      { title: "Find things", detail: "\"Find the Q3 budget\" searches your files, email, tasks and projects." },
      { title: "Make changes (with your approval)", detail: "\"Create a task to send the invoice\" prepares a task you approve before it's created." },
    );
    nextStep = noApps ? "Connect an app in Integrations so there's real work to look at." : undefined;
  } else if (intent === "create_task") {
    try {
      const payload = validateActionPayload("CreateTask", { title: arg!.slice(0, 200) });
      const action = await db.pendingAction.create({ data: { workspaceId, userId, kind: "CreateTask", payload: payload as object } });
      pendingActions.push({ id: action.id, kind: action.kind, payload: action.payload });
      headline = `I've prepared a task: "${arg!.slice(0, 200)}". It's waiting for your approval below.`;
    } catch (err) {
      headline = `I couldn't prepare that task: ${err instanceof Error ? err.message : "invalid details"}.`;
    }
  } else if (intent === "priorities") {
    const [tasks, messages, events, projects] = await Promise.all([
      db.task.findMany({ where: { workspaceId, status: { not: "Done" }, OR: [{ assigneeId: userId }, { creatorId: userId }] }, orderBy: [{ dueDate: "asc" }], take: 40, select: { id: true, title: true, dueDate: true, status: true, priority: true } }),
      db.syncedMessage.findMany({ where: { workspaceId, userId, isUnread: true, receivedAt: { gte: new Date(now.getTime() - 3 * DAY) } }, orderBy: { receivedAt: "desc" }, take: 3, select: { subject: true, fromName: true, permalink: true } }),
      db.syncedEvent.findMany({ where: { workspaceId, userId, startAt: { gte: now, lte: new Date(now.getTime() + DAY) } }, orderBy: { startAt: "asc" }, take: 3, select: { title: true, startAt: true, permalink: true } }),
      db.project.findMany({ where: { workspaceId, status: { in: ["AtRisk", "Behind"] } }, take: 3, select: { id: true, name: true, status: true } }),
    ]);
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < now);
    const dueToday = tasks.filter((t) => t.dueDate && !overdue.includes(t) && t.dueDate.toDateString() === now.toDateString());
    for (const t of overdue.slice(0, 3)) findings.push({ title: `Overdue: ${t.title}`, detail: `Was due ${day(t.dueDate!)}.`, source: cite("task", t.title, "/tasks") });
    for (const t of dueToday.slice(0, 3)) findings.push({ title: `Due today: ${t.title}`, detail: `${t.priority} priority.`, source: cite("task", t.title, "/tasks") });
    for (const e of events) findings.push({ title: `Meeting: ${e.title}`, detail: `Starts ${when(e.startAt)}.`, source: cite("meeting", e.title, e.permalink ?? "/calendar") });
    for (const m of messages) findings.push({ title: `Unread: ${trim(m.subject, 70) || "(no subject)"}`, detail: `From ${m.fromName ?? "someone"}.`, source: cite("email", trim(m.subject, 70) || "Message", m.permalink ?? "/inbox") });
    for (const p of projects) findings.push({ title: `${p.name} is ${p.status === "Behind" ? "behind" : "at risk"}`, detail: "Marked in Projects.", source: cite("project", p.name, `/projects/${p.id}`) });
    headline = findings.length
      ? `Here's what needs your attention (${findings.length} item${findings.length === 1 ? "" : "s"}).`
      : noApps ? "There's nothing to prioritize yet - no apps are connected and you have no open tasks." : "Nothing looks urgent right now: no overdue or due-today tasks, no unread email in the last 3 days, and no meetings in the next 24 hours.";
    nextStep = findings[0] ? `Start with: ${findings[0].title.replace(/^(Overdue|Due today|Meeting|Unread): /, "")}.` : undefined;
  } else if (intent === "meetings") {
    const events = await db.syncedEvent.findMany({ where: { workspaceId, userId, startAt: { gte: now, lte: new Date(now.getTime() + 7 * DAY) } }, orderBy: { startAt: "asc" }, take: 8, select: { title: true, startAt: true, location: true, permalink: true } });
    for (const e of events) findings.push({ title: e.title, detail: `${when(e.startAt)}${e.location ? ` - ${trim(e.location, 60)}` : ""}`, source: cite("meeting", e.title, e.permalink ?? "/calendar") });
    headline = events.length ? `You have ${events.length} meeting${events.length === 1 ? "" : "s"} in the next 7 days.` : noApps ? "No calendar is connected yet." : "No meetings found in the next 7 days.";
    if (!events.length && noApps) actions.push({ label: "Connect an app", href: "/integrations" });
  } else if (intent === "email") {
    const msgs = await db.syncedMessage.findMany({ where: { workspaceId, userId, isUnread: true }, orderBy: { receivedAt: "desc" }, take: 8, select: { subject: true, fromName: true, snippet: true, receivedAt: true, permalink: true, provider: true } });
    for (const m of msgs) findings.push({ title: trim(m.subject, 80) || "(no subject)", detail: `${m.fromName ?? "Someone"} - ${day(m.receivedAt)}. ${trim(m.snippet, 90)}`, source: cite("email", trim(m.subject, 80) || "Message", m.permalink ?? "/inbox") });
    headline = msgs.length ? `You have ${msgs.length} unread item${msgs.length === 1 ? "" : "s"}${msgs.length === 8 ? " (showing the latest 8)" : ""}.` : noApps ? "No email or chat app is connected yet." : "No unread messages.";
    if (!msgs.length && noApps) actions.push({ label: "Connect an app", href: "/integrations" });
  } else if (intent === "tasks") {
    const tasks = await db.task.findMany({ where: { workspaceId, status: { not: "Done" }, OR: [{ assigneeId: userId }, { creatorId: userId }] }, orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }], take: 8, select: { title: true, dueDate: true, status: true, priority: true, blockedReason: true } });
    for (const t of tasks) {
      const late = t.dueDate && t.dueDate < now;
      findings.push({ title: t.title, detail: `${t.status}${t.dueDate ? `, ${late ? "overdue since" : "due"} ${day(t.dueDate)}` : ", no due date"}${t.blockedReason ? ` - blocked: ${trim(t.blockedReason, 60)}` : ""}.`, source: cite("task", t.title, "/tasks") });
    }
    headline = tasks.length ? `You have ${tasks.length} open task${tasks.length === 1 ? "" : "s"}${tasks.length === 8 ? " (showing the first 8)" : ""}.` : "You have no open tasks.";
    nextStep = tasks.length ? undefined : "Say \"create a task to ...\" and I'll prepare one for your approval.";
  } else if (intent === "projects") {
    const projects = await db.project.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, name: true, status: true, progress: true, deadline: true } });
    for (const p of projects) findings.push({ title: p.name, detail: `${p.status.replace(/([a-z])([A-Z])/g, "$1 $2")}, ${p.progress}% complete${p.deadline ? `, deadline ${day(p.deadline)}` : ""}.`, source: cite("project", p.name, `/projects/${p.id}`) });
    const risky = projects.filter((p) => p.status === "AtRisk" || p.status === "Behind").length;
    headline = projects.length ? `${projects.length} project${projects.length === 1 ? "" : "s"}${risky ? `, ${risky} at risk or behind` : ", none at risk"}.` : "There are no projects yet.";
  } else {
    const words = [...new Set((arg ?? "").toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)))].slice(0, 5);
    if (!words.length) {
      headline = "Tell me what to look for, for example \"find the Q3 budget\" or ask \"what are my priorities?\".";
    } else {
      const has = (field: string) => ({ OR: words.map((w) => ({ [field]: { contains: w, mode: "insensitive" as const } })) });
      const [files, msgs, tasks, projects] = await Promise.all([
        db.syncedFile.findMany({ where: { workspaceId, userId, ...has("name") }, orderBy: { modifiedAt: "desc" }, take: 4, select: { name: true, webUrl: true, modifiedAt: true } }),
        db.syncedMessage.findMany({ where: { workspaceId, userId, OR: [...has("subject").OR, ...has("snippet").OR] }, orderBy: { receivedAt: "desc" }, take: 4, select: { subject: true, fromName: true, permalink: true, receivedAt: true } }),
        db.task.findMany({ where: { workspaceId, ...has("title") }, take: 3, select: { title: true, status: true } }),
        db.project.findMany({ where: { workspaceId, ...has("name") }, take: 3, select: { id: true, name: true } }),
      ]);
      for (const f of files) findings.push({ title: f.name, detail: `File, modified ${day(f.modifiedAt)}.`, source: cite("file", f.name, f.webUrl ?? "/files") });
      for (const m of msgs) findings.push({ title: trim(m.subject, 80) || "(no subject)", detail: `Message from ${m.fromName ?? "someone"}, ${day(m.receivedAt)}.`, source: cite("email", trim(m.subject, 80) || "Message", m.permalink ?? "/inbox") });
      for (const t of tasks) findings.push({ title: t.title, detail: `Task (${t.status}).`, source: cite("task", t.title, "/tasks") });
      for (const p of projects) findings.push({ title: p.name, detail: "Project.", source: cite("project", p.name, `/projects/${p.id}`) });
      headline = findings.length
        ? `I found ${findings.length} match${findings.length === 1 ? "" : "es"} for "${words.join(" ")}".`
        : `I couldn't find anything matching "${words.join(" ")}" in your synced files, messages, tasks or projects.${noApps ? " No apps are connected yet." : ""}`;
      if (!findings.length) nextStep = noApps ? "Connect an app in Integrations so STACK has something to search." : "Try different keywords, or press Sync now on Home to pull in the latest.";
    }
  }

  if (opts.reason) findings.push({ title: "Basic mode", detail: opts.reason });

  const structured: StructuredAnswer = { headline, findings: findings.slice(0, 9), nextStep, actions };
  return { answer: headline, structured, pendingActions, used };
}
