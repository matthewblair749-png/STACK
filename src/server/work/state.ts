import { db } from "@/server/db";
import type {
  DailyBrief, PriorityItem, ProjectPulse, SourceRef, WaitingItem, WorkAction, WorkState,
} from "@/lib/work-types";

const DAY = 24 * 60 * 60 * 1000;
const URGENT_WORDS = /\b(urgent|asap|action required|deadline|please respond|waiting on you|need(s|ed)? (this|your)|can you)\b/i;

function fmtTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function minutesUntil(d: Date, now: Date) {
  return Math.round((d.getTime() - now.getTime()) / 60000);
}

/**
 * The single, explainable picture of a user's work. Everything here is derived from real rows
 * (tasks, projects, synced messages/events, context-graph links, insights) with deterministic
 * scoring, so every priority can say exactly *why* it is on the list. Nothing is invented: when
 * no app has synced, the state is built from tasks/projects alone and says so.
 */
export async function computeWorkState(workspaceId: string, userId: string): Promise<WorkState> {
  const now = new Date();
  const [me, members, tasks, projects, messages, events, integrations, nextStepInsights, files] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
    db.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true, user: { select: { name: true, email: true } } } }),
    db.task.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 500,
      select: {
        id: true, title: true, status: true, priority: true, dueDate: true, projectId: true,
        assigneeId: true, creatorId: true, blockedReason: true, waitingOnId: true, updatedAt: true,
      },
    }),
    db.project.findMany({ where: { workspaceId }, select: { id: true, name: true, status: true, deadline: true, updatedAt: true } }),
    db.syncedMessage.findMany({
      where: { workspaceId, userId, receivedAt: { gte: new Date(now.getTime() - 3 * DAY) } },
      orderBy: { receivedAt: "desc" },
      take: 80,
      select: { id: true, provider: true, subject: true, snippet: true, fromName: true, fromAddress: true, receivedAt: true, isUnread: true, permalink: true },
    }),
    db.syncedEvent.findMany({
      where: { workspaceId, userId, startAt: { gte: now, lte: new Date(now.getTime() + 36 * 60 * 60 * 1000) } },
      orderBy: { startAt: "asc" },
      take: 20,
      select: { id: true, provider: true, title: true, startAt: true, permalink: true },
    }),
    db.integration.findMany({ where: { workspaceId, userId }, select: { provider: true, syncError: true, lastSyncAt: true } }),
    db.insight.findMany({
      where: { workspaceId, userId, status: "Open", category: "next_step" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, body: true },
    }),
    db.syncedFile.findMany({
      where: { workspaceId, userId, modifiedAt: { gte: new Date(now.getTime() - 7 * DAY) } },
      orderBy: { modifiedAt: "desc" },
      take: 30,
      select: { id: true, provider: true, name: true, webUrl: true },
    }),
  ]);

  const nameOf = (id?: string | null) => {
    const m = members.find((x) => x.userId === id);
    return m ? m.user.name ?? m.user.email ?? "A teammate" : undefined;
  };
  const myEmail = me?.email?.toLowerCase();

  // Context-graph links, so a message/meeting can strengthen the priority of the task/project it mentions.
  const contentIds = [...messages.map((m) => m.id), ...events.map((e) => e.id), ...files.map((f) => f.id)];
  const links = contentIds.length
    ? await db.entityLink.findMany({
        where: { workspaceId, fromId: { in: contentIds }, toType: { in: ["Task", "Project"] } },
        select: { fromType: true, fromId: true, toType: true, toId: true },
      })
    : [];
  const eventById = new Map(events.map((e) => [e.id, e]));
  const messageById = new Map(messages.map((m) => [m.id, m]));

  const mine = (t: (typeof tasks)[number]) => t.assigneeId === userId || (!t.assigneeId && t.creatorId === userId);
  const openMine = tasks.filter((t) => t.status !== "Done" && mine(t));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const items = new Map<string, PriorityItem>();

  // --- Tasks ---
  for (const t of openMine) {
    let score = 0;
    const why: string[] = [];
    const refs: SourceRef[] = [{ type: "Task", id: t.id, label: t.title, href: "/tasks" }];
    if (t.dueDate && t.dueDate < now) {
      const days = Math.max(1, Math.floor((now.getTime() - t.dueDate.getTime()) / DAY));
      score += 100;
      why.push(`Overdue by ${plural(days, "day")}.`);
    } else if (t.dueDate && t.dueDate.toDateString() === now.toDateString()) {
      score += 80;
      why.push("Due today.");
    } else if (t.dueDate && t.dueDate.getTime() - now.getTime() < 2 * DAY) {
      score += 40;
      why.push("Due within 48 hours.");
    }
    if (t.priority === "Urgent") { score += 30; why.push("Marked urgent."); }
    else if (t.priority === "High") { score += 15; why.push("Marked high priority."); }
    if (t.status === "Blocked") { score += 25; why.push(t.blockedReason ? `Blocked: ${t.blockedReason}.` : "Blocked."); }
    const project = t.projectId ? projectById.get(t.projectId) : undefined;
    // Context (project health, linked meetings/messages) only strengthens a task that already matters
    // on its own; it never promotes an otherwise unremarkable task.
    let boost = 0;
    const boostWhy: string[] = [];
    if (project && (project.status === "AtRisk" || project.status === "Behind")) {
      boost += 20;
      boostWhy.push(`${project.name} is ${project.status === "Behind" ? "behind schedule" : "at risk"}.`);
    }
    if (t.waitingOnId && t.waitingOnId !== userId) {
      why.push(`Waiting on ${nameOf(t.waitingOnId) ?? "someone"}.`);
    }
    // Real content linked to this task/project via the context graph.
    let nextEvent: (typeof events)[number] | undefined;
    for (const l of links) {
      const direct = l.toType === "Task" && l.toId === t.id;
      const viaProject = l.toType === "Project" && !!t.projectId && l.toId === t.projectId;
      if (!direct && !viaProject) continue;
      if (l.fromType === "SyncedEvent") {
        const ev = eventById.get(l.fromId);
        if (ev) {
          boost += direct ? 30 : 12;
          boostWhy.push(`"${ev.title}" at ${fmtTime(ev.startAt)} is linked to this${direct ? "" : " project"}.`);
          refs.push({ type: "SyncedEvent", id: ev.id, label: ev.title, href: ev.permalink ?? undefined });
          if (!nextEvent) nextEvent = ev;
        }
      } else if (l.fromType === "SyncedMessage") {
        const m = messageById.get(l.fromId);
        if (m && (m.isUnread || URGENT_WORDS.test(`${m.subject} ${m.snippet}`))) {
          boost += direct ? 20 : 8;
          boostWhy.push(`Related message from ${m.fromName ?? "someone"}: "${m.subject ?? "(no subject)"}".`);
          refs.push({ type: "SyncedMessage", id: m.id, label: m.subject ?? "Message", href: m.permalink ?? undefined });
        }
      }
    }
    if (score === 0) continue;
    score += boost;
    why.push(...boostWhy);

    const nextStep =
      t.status === "Blocked"
        ? `Resolve the blocker${t.blockedReason ? ` (${t.blockedReason})` : ""} before continuing.`
        : nextEvent
          ? `Finish "${t.title}" before "${nextEvent.title}" at ${fmtTime(nextEvent.startAt)}.`
          : t.dueDate && t.dueDate < now
            ? `Finish or reschedule "${t.title}" now.`
            : `Work on "${t.title}" next.`;
    items.set(`task:${t.id}`, {
      id: `task:${t.id}`,
      kind: "task",
      title: t.title,
      why,
      nextStep,
      score,
      due: t.dueDate?.toISOString(),
      refs,
      actions: [
        { label: "Break it down", command: `What do I need to do to finish "${t.title}"?` },
        { label: "Open tasks", href: "/tasks" },
      ],
    });
  }

  // --- Other people waiting on me (tasks) ---
  const waitingOnMe: WaitingItem[] = [];
  for (const t of tasks) {
    if (t.status === "Done" || t.waitingOnId !== userId) continue;
    const who = nameOf(t.assigneeId ?? t.creatorId);
    waitingOnMe.push({ id: t.id, title: t.title, who, since: t.updatedAt.toISOString(), href: "/tasks" });
    items.set(`waiting:${t.id}`, {
      id: `waiting:${t.id}`,
      kind: "waiting",
      title: `${who ?? "A teammate"} is waiting on you`,
      why: [`"${t.title}" is waiting for your input.`],
      nextStep: `Unblock "${t.title}" for ${who ?? "them"}.`,
      score: 60,
      refs: [{ type: "Task", id: t.id, label: t.title, href: "/tasks" }],
      actions: [{ label: "Open task", href: "/tasks" }],
    });
  }

  // --- Messages that look like they need me ---
  const importantMessages: WorkState["understand"]["importantMessages"] = [];
  for (const m of messages) {
    const fromMe = !!myEmail && m.fromAddress?.toLowerCase() === myEmail;
    if (fromMe) continue;
    const text = `${m.subject ?? ""} ${m.snippet}`;
    const urgent = URGENT_WORDS.test(text);
    if (!m.isUnread && !urgent) continue;
    importantMessages.push({ id: m.id, from: m.fromName ?? "Unknown sender", subject: m.subject ?? "(no subject)", receivedAt: m.receivedAt.toISOString(), href: m.permalink ?? undefined });
    if (!(urgent && m.isUnread)) continue;
    const from = m.fromName ?? "someone";
    waitingOnMe.push({ id: m.id, title: m.subject ?? "(no subject)", who: from, since: m.receivedAt.toISOString(), href: m.permalink ?? undefined });
    items.set(`message:${m.id}`, {
      id: `message:${m.id}`,
      kind: "message",
      title: `${from}: ${m.subject ?? "a message"}`,
      why: [m.isUnread ? "Unread." : "Read but likely unanswered.", "Wording suggests they are waiting on a reply."],
      nextStep: `Review and reply to ${from}.`,
      score: 55,
      refs: [{ type: "SyncedMessage", id: m.id, label: m.subject ?? "Message", href: m.permalink ?? undefined }],
      actions: [
        { label: "Draft response", command: `Draft a response to ${from} about "${m.subject ?? "their message"}"` },
        ...(m.permalink ? [{ label: "Open message", href: m.permalink }] : []),
      ],
    });
  }

  // --- Meetings coming up ---
  for (const e of events) {
    const mins = minutesUntil(e.startAt, now);
    if (mins > 180) continue;
    items.set(`event:${e.id}`, {
      id: `event:${e.id}`,
      kind: "event",
      title: e.title,
      why: [`Starts in ${mins < 60 ? plural(Math.max(mins, 1), "minute") : plural(Math.round(mins / 60), "hour")} (${fmtTime(e.startAt)}).`],
      nextStep: `Prepare for "${e.title}".`,
      score: mins <= 60 ? 75 : 45,
      due: e.startAt.toISOString(),
      refs: [{ type: "SyncedEvent", id: e.id, label: e.title, href: e.permalink ?? undefined }],
      actions: [
        { label: "Prepare me", command: `Prepare me for "${e.title}"` },
        ...(e.permalink ? [{ label: "Open event", href: e.permalink }] : []),
      ],
    });
  }

  const priorities = [...items.values()].sort((a, b) => b.score - a.score).slice(0, 5);

  // --- Move forward: projects, deadlines, waiting ---
  const pulses: ProjectPulse[] = projects
    .filter((p) => p.status !== "Completed")
    .map((p) => {
      const pt = tasks.filter((t) => t.projectId === p.id);
      const completed = pt.filter((t) => t.status === "Done").length;
      const blockedTasks = pt.filter((t) => t.status === "Blocked");
      const waiting = pt.filter((t) => t.status !== "Done" && t.waitingOnId).length;
      const nextOpen = pt
        .filter((t) => t.status !== "Done" && t.status !== "Blocked")
        .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))[0];
      const recommendation = blockedTasks.length
        ? `Resolve the blocker on "${blockedTasks[0].title}"${blockedTasks[0].blockedReason ? ` (${blockedTasks[0].blockedReason})` : ""} before continuing the remaining tasks.`
        : p.status === "Behind" && nextOpen
          ? `Behind schedule - focus on "${nextOpen.title}".`
          : nextOpen
            ? `Next up: "${nextOpen.title}".`
            : pt.length > 0
              ? "All tasks are complete - consider marking the project completed."
              : undefined;
      return {
        id: p.id, name: p.name, status: p.status, completed, total: pt.length,
        blocked: blockedTasks.length, waiting, deadline: p.deadline?.toISOString(), recommendation,
      };
    })
    .filter((p) => p.total > 0 || p.status !== "OnTrack")
    .sort((a, b) => b.blocked - a.blocked || (a.status === "OnTrack" ? 1 : 0) - (b.status === "OnTrack" ? 1 : 0))
    .slice(0, 6);

  const weekOut = new Date(now.getTime() + 7 * DAY);
  const deadlines: WorkState["moveForward"]["deadlines"] = [
    ...openMine.filter((t) => t.dueDate && t.dueDate >= now && t.dueDate <= weekOut).map((t) => ({ id: t.id, title: t.title, due: t.dueDate!.toISOString(), kind: "task" as const })),
    ...projects.filter((p) => p.status !== "Completed" && p.deadline && p.deadline >= now && p.deadline <= weekOut).map((p) => ({ id: p.id, title: p.name, due: p.deadline!.toISOString(), kind: "project" as const })),
  ]
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 6);

  const waitingOnOthers: WaitingItem[] = openMine
    .filter((t) => t.waitingOnId && t.waitingOnId !== userId)
    .map((t) => ({ id: t.id, title: t.title, who: nameOf(t.waitingOnId), since: t.updatedAt.toISOString(), href: "/tasks" }));

  const projectsNeedingAttention = projects.filter((p) => p.status === "AtRisk" || p.status === "Behind").length;
  const counts = {
    importantMessages: importantMessages.length,
    upcomingMeetings: events.length,
    projectsNeedingAttention,
    openTasks: openMine.length,
  };

  const hasSyncedContent = messages.length + events.length > 0;
  const bits: string[] = [];
  if (counts.importantMessages) bits.push(plural(counts.importantMessages, "important conversation"));
  if (counts.upcomingMeetings) bits.push(plural(counts.upcomingMeetings, "upcoming meeting"));
  if (counts.projectsNeedingAttention) bits.push(plural(counts.projectsNeedingAttention, "project") + (counts.projectsNeedingAttention === 1 ? " requiring attention" : " requiring attention"));
  if (counts.openTasks) bits.push(plural(counts.openTasks, "open task"));
  const overview = bits.length
    ? `You have ${bits.slice(0, -1).join(", ")}${bits.length > 1 ? " and " : ""}${bits[bits.length - 1]}.`
    : integrations.length === 0
      ? "Nothing to understand yet. Connect an app or add tasks and STACK will start building context."
      : "Nothing needs your attention right now.";

  // --- Act: real commands, only offered when there is something to act on ---
  const act: WorkAction[] = [];
  if (events.length) act.push({ label: "Prepare meeting", command: "Prepare me for my next meeting", hint: `"${events[0].title}" at ${fmtTime(events[0].startAt)}` });
  act.push({ label: "Create task", intent: "new-task", hint: "Add it to STACK" });
  if (importantMessages.length) act.push({ label: "Draft response", command: `Draft a response to ${importantMessages[0].from} about "${importantMessages[0].subject}"`, hint: `${importantMessages[0].from}` });
  act.push({ label: "Find document", command: "Find the latest proposal", hint: "Searches your synced files" });
  const atRisk = pulses.find((p) => p.status === "AtRisk" || p.status === "Behind" || p.blocked > 0);
  if (atRisk) act.push({ label: "Review project", href: `/projects/${atRisk.id}`, hint: atRisk.name });
  const pending = await db.pendingAction.count({ where: { workspaceId, userId, status: "Pending" } });
  if (pending > 0) act.push({ label: "Send for approval", intent: "review-approvals", hint: `${plural(pending, "action")} awaiting you` });

  // --- Understand: per-project digests of what really happened, with the apps they came from ---
  const projectOfTask = new Map(tasks.filter((t) => t.projectId).map((t) => [t.id, t.projectId!]));
  const fileById = new Map(files.map((f) => [f.id, f]));
  const digestMap = new Map<string, { items: string[]; apps: Set<string>; important: number }>();
  const digestFor = (pid: string) => {
    let d = digestMap.get(pid);
    if (!d) digestMap.set(pid, (d = { items: [], apps: new Set(), important: 0 }));
    return d;
  };
  const seenLink = new Set<string>();
  for (const l of links) {
    const pid = l.toType === "Project" ? l.toId : projectOfTask.get(l.toId);
    if (!pid || !projectById.has(pid)) continue;
    const key = `${pid}:${l.fromId}`;
    if (seenLink.has(key)) continue;
    seenLink.add(key);
    const d = digestFor(pid);
    if (l.fromType === "SyncedMessage") {
      const m = messageById.get(l.fromId);
      if (!m) continue;
      d.apps.add(m.provider);
      if (m.isUnread || URGENT_WORDS.test(`${m.subject} ${m.snippet}`)) {
        d.important++;
        if (d.items.length < 3) d.items.push(`${m.fromName ?? "Someone"}: "${m.subject ?? "(no subject)"}"`);
      }
    } else if (l.fromType === "SyncedEvent") {
      const ev = eventById.get(l.fromId);
      if (!ev) continue;
      d.apps.add(ev.provider);
      d.important++;
      if (d.items.length < 3) d.items.push(`"${ev.title}" at ${fmtTime(ev.startAt)}`);
    } else if (l.fromType === "SyncedFile") {
      const f = fileById.get(l.fromId);
      if (!f) continue;
      d.apps.add(f.provider);
      if (d.items.length < 3) d.items.push(`File updated: ${f.name}`);
    }
  }
  for (const p of projects) {
    if (p.status === "Completed") continue;
    const d = digestFor(p.id);
    const blockedCount = tasks.filter((t) => t.projectId === p.id && t.status === "Blocked").length;
    if (blockedCount && d.items.length < 3) d.items.push(`${plural(blockedCount, "task")} blocked`);
    if (p.deadline && p.deadline.getTime() > now.getTime() && p.deadline.getTime() - now.getTime() < 7 * DAY && d.items.length < 3) {
      d.items.push(`Deadline approaching: ${p.deadline.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`);
    }
    if (d.items.length === 0) digestMap.delete(p.id);
  }
  const digests = [...digestMap.entries()]
    .map(([pid, d]) => ({
      projectId: pid,
      name: projectById.get(pid)!.name,
      items: d.items,
      sources: [...d.apps].map((appId) => ({ appId, label: appId })),
      href: `/projects/${pid}`,
      weight: d.items.length + d.important,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map(({ weight, ...rest }) => (void weight, rest));

  // --- Move forward extras ---
  const upNext = [
    ...events.slice(0, 5).map((e) => ({ id: e.id, title: e.title, at: e.startAt.toISOString(), kind: "meeting" as const, appId: e.provider, href: e.permalink ?? undefined })),
    ...deadlines.map((d) => ({ id: d.id, title: d.title, at: d.due, kind: d.kind === "project" ? ("milestone" as const) : ("deadline" as const), href: d.kind === "project" ? `/projects/${d.id}` : "/tasks" })),
  ]
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 5);
  const atRiskList = pulses
    .filter((p) => p.status === "AtRisk" || p.status === "Behind" || p.blocked > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      reason: [p.deadline && new Date(p.deadline).getTime() - now.getTime() < 7 * DAY && new Date(p.deadline).getTime() > now.getTime() ? "Milestone approaching" : undefined, p.blocked ? plural(p.blocked, "blocker") : undefined, p.status === "Behind" ? "Behind schedule" : undefined]
        .filter(Boolean)
        .join(" - ") || "Needs attention",
    }));
  const topPriority = priorities[0];
  const nextBestAction = topPriority ? { title: topPriority.nextStep, why: topPriority.why[0], action: topPriority.actions[0] } : null;
  return {
    generatedAt: now.toISOString(),
    hasSyncedContent,
    connectedProviders: integrations.filter((i) => !i.syncError).map((i) => i.provider),
    lastSyncAt: integrations.map((i) => i.lastSyncAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString(),
    understand: {
      overview,
      counts,
      importantMessages: importantMessages.slice(0, 4),
      upcomingMeetings: events.slice(0, 4).map((e) => ({ id: e.id, title: e.title, startAt: e.startAt.toISOString(), href: e.permalink ?? undefined })),
      projectChanges: projects
        .filter((p) => now.getTime() - p.updatedAt.getTime() < 3 * DAY)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 4)
        .map((p) => ({ id: p.id, name: p.name, status: p.status, updatedAt: p.updatedAt.toISOString() })),
      digests,
    },
    priorities,
    act,
    moveForward: {
      deadlines,
      projects: pulses,
      waitingOnMe: waitingOnMe.slice(0, 5),
      waitingOnOthers: waitingOnOthers.slice(0, 5),
      nextSteps: nextStepInsights.map((i) => ({ id: i.id, title: i.title, body: i.body ?? undefined })),
      upNext,
      atRisk: atRiskList,
      nextBestAction,
    },
  };
}

const STATE_TTL_MS = 15_000;
const stateCache = new Map<string, { at: number; value: Promise<WorkState> }>();

/**
 * Short per-user cache so opening Home, the brief and the sidebar in quick succession doesn't
 * recompute the whole picture each time. Sync and approvals call invalidateWorkState() so
 * anything the user just did is reflected immediately.
 */
export function getWorkState(workspaceId: string, userId: string): Promise<WorkState> {
  const key = `${workspaceId}:${userId}`;
  const hit = stateCache.get(key);
  if (hit && Date.now() - hit.at < STATE_TTL_MS) return hit.value;
  const value = computeWorkState(workspaceId, userId);
  stateCache.set(key, { at: Date.now(), value });
  value.catch(() => stateCache.delete(key));
  return value;
}

export function invalidateWorkState(workspaceId: string, userId: string) {
  stateCache.delete(`${workspaceId}:${userId}`);
}

export function buildDailyBrief(state: WorkState, firstName: string): DailyBrief {
  const hour = new Date().getHours();
  const greeting = `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, ${firstName}.`;
  const meetingsToPrepare = state.priorities.filter((p) => p.kind === "event").length;
  const peopleWaiting = state.moveForward.waitingOnMe.length + state.priorities.filter((p) => p.kind === "message").length;
  const top = state.priorities[0];
  return {
    greeting,
    counts: {
      priorities: state.priorities.length,
      meetingsToPrepare,
      projectsAtRisk: state.understand.counts.projectsNeedingAttention,
      peopleWaiting,
      dueThisWeek: state.moveForward.deadlines.filter((d) => d.kind === "task").length,
    },
    plan: top
      ? { headline: `Start with ${top.title}.`, reason: `${top.why.join(" ")} ${top.nextStep}`.trim(), action: top.actions[0] }
      : null,
    hasAnything: state.priorities.length > 0,
  };
}
