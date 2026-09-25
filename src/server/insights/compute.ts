import { db } from "@/server/db";
import type { EntityKind, InsightLevel } from "@prisma/client";

const URGENCY_KEYWORDS = /\b(urgent|asap|action required|deadline|please respond)\b/i;
const MESSAGE_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;
const EVENT_SOON_MS = 60 * 60 * 1000;
const EVENT_VERY_SOON_MS = 15 * 60 * 1000;

interface DraftInsight {
  level: InsightLevel;
  category: string;
  title: string;
  body?: string;
  subjectType?: EntityKind;
  subjectId?: string;
  dedupeKey: string;
}

/**
 * Computes real "what matters" signals from the workspace's actual Task/
 * Project/Synced* data — never invented. Upserts by `dedupeKey` so
 * recomputation never duplicates, and never resurrects an Insight the user
 * already dismissed. Insights whose underlying condition has resolved (task
 * done, project back on track, event passed) are auto-dismissed so the list
 * stays honest.
 */
export async function computeInsights(workspaceId: string, userId: string): Promise<{ created: number; updated: number; dismissed: number }> {
  const now = new Date();

  const [tasks, projects, events, messages, entityLinks] = await Promise.all([
    db.task.findMany({
      where: { workspaceId, OR: [{ assigneeId: userId }, { creatorId: userId }] },
      select: { id: true, title: true, status: true, dueDate: true, projectId: true },
    }),
    db.project.findMany({ where: { workspaceId }, select: { id: true, name: true, status: true } }),
    db.syncedEvent.findMany({
      where: { workspaceId, userId, startAt: { gte: now, lte: new Date(now.getTime() + EVENT_SOON_MS) } },
      select: { id: true, title: true, startAt: true },
    }),
    db.syncedMessage.findMany({
      where: { workspaceId, userId, receivedAt: { gte: new Date(now.getTime() - MESSAGE_LOOKBACK_MS) } },
      select: { id: true, subject: true, snippet: true, fromName: true },
    }),
    db.entityLink.findMany({
      where: { workspaceId, toType: "Project", relation: "mentions_project" },
      select: { fromId: true, toId: true },
    }),
  ]);

  const atRiskProjectIds = new Set(projects.filter((p) => p.status === "AtRisk" || p.status === "Behind").map((p) => p.id));
  const messageToProjects = new Map<string, string[]>();
  for (const link of entityLinks) {
    const list = messageToProjects.get(link.fromId) ?? [];
    list.push(link.toId);
    messageToProjects.set(link.fromId, list);
  }

  const drafts: DraftInsight[] = [];

  for (const t of tasks) {
    if (t.status === "Done") continue;
    if (t.dueDate && t.dueDate < now) {
      drafts.push({
        level: "Urgent",
        category: "task_overdue",
        title: `Overdue: "${t.title}"`,
        subjectType: "Task",
        subjectId: t.id,
        dedupeKey: `task:${t.id}:overdue`,
      });
    } else if (t.dueDate && t.dueDate.toDateString() === now.toDateString()) {
      drafts.push({
        level: "Important",
        category: "task_due_today",
        title: `Due today: "${t.title}"`,
        subjectType: "Task",
        subjectId: t.id,
        dedupeKey: `task:${t.id}:due_today`,
      });
    }
  }

  for (const p of projects) {
    if (p.status === "AtRisk" || p.status === "Behind") {
      drafts.push({
        level: p.status === "Behind" ? "Urgent" : "Important",
        category: "project_status",
        title: `${p.name} ${p.status === "Behind" ? "is behind schedule" : "may need attention"}`,
        subjectType: "Project",
        subjectId: p.id,
        dedupeKey: `project:${p.id}:status`,
      });
    }
  }

  for (const e of events) {
    const msUntil = e.startAt.getTime() - now.getTime();
    drafts.push({
      level: msUntil <= EVENT_VERY_SOON_MS ? "Urgent" : "Important",
      category: "event_soon",
      title: `"${e.title}" starts soon`,
      body: `Starting at ${e.startAt.toLocaleTimeString()}`,
      subjectType: "SyncedEvent",
      subjectId: e.id,
      dedupeKey: `event:${e.id}:soon`,
    });
  }

  for (const m of messages) {
    const text = `${m.subject ?? ""} ${m.snippet}`;
    const linkedProjects = messageToProjects.get(m.id) ?? [];
    const linkedToAtRisk = linkedProjects.some((pid) => atRiskProjectIds.has(pid));
    if (URGENCY_KEYWORDS.test(text) || linkedToAtRisk) {
      drafts.push({
        level: "Important",
        category: "message_attention",
        title: `${m.fromName ?? "Someone"}: ${m.subject ?? "a message"} needs attention`,
        body: m.snippet,
        subjectType: "SyncedMessage",
        subjectId: m.id,
        dedupeKey: `message:${m.id}:attention`,
      });
    }
  }

  let created = 0;
  let updated = 0;
  const managedCategories = ["task_overdue", "task_due_today", "project_status", "event_soon", "message_attention"];
  const freshKeys = new Set(drafts.map((d) => d.dedupeKey));

  // One lookup for every draft, one bulk insert for new ones, updates only where something changed.
  const existingRows = drafts.length
    ? await db.insight.findMany({ where: { workspaceId, userId, dedupeKey: { in: drafts.map((d) => d.dedupeKey) } } })
    : [];
  const existingByKey = new Map(existingRows.map((e) => [e.dedupeKey, e]));
  const toCreate = drafts.filter((d) => !existingByKey.has(d.dedupeKey));
  const toUpdate = drafts.filter((d) => {
    const e = existingByKey.get(d.dedupeKey);
    // If the user already dismissed it, leave it dismissed — never resurrect.
    return e && e.status !== "Dismissed" && (e.title !== d.title || e.level !== d.level || (e.body ?? null) !== (d.body ?? null));
  });
  await Promise.all([
    toCreate.length ? db.insight.createMany({ data: toCreate.map((d) => ({ workspaceId, userId, status: "Open" as const, ...d })), skipDuplicates: true }) : undefined,
    ...toUpdate.map((d) => db.insight.update({ where: { id: existingByKey.get(d.dedupeKey)!.id }, data: { ...d } })),
  ]);
  created = toCreate.length;
  updated = toUpdate.length;

  const staleOpen = await db.insight.findMany({
    where: { workspaceId, userId, status: "Open", category: { in: managedCategories } },
    select: { id: true, dedupeKey: true },
  });
  const staleIds = staleOpen.filter((i) => !freshKeys.has(i.dedupeKey)).map((i) => i.id);
  let dismissed = 0;
  if (staleIds.length > 0) {
    const result = await db.insight.updateMany({ where: { id: { in: staleIds } }, data: { status: "Dismissed" } });
    dismissed = result.count;
  }

  return { created, updated, dismissed };
}
