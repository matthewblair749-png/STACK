import { db } from "@/server/db";
import { GROUP_BY_ID, INBOX_GROUPS, type DataGroupId } from "@/lib/data-groups";

const URGENT = /\b(urgent|asap|action required|deadline|please respond|overdue|time[- ]sensitive)\b/i;
/** Senders that are machines, not people: they rarely need a person's reply. */
const AUTOMATED = /(^|[._+-])(no-?reply|do-?not-?reply|notifications?|newsletters?|digest|marketing|mailer-daemon)([._+-]|@)/i;
const EMAIL_PROVIDERS = GROUP_BY_ID.email.providers;
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
/** A message needs this score to be called important: one strong signal, or two weak ones. */
export const IMPORTANT_MIN = 2;

export interface MessageSignals {
  /** Sent by someone in this workspace. */
  fromTeammate: boolean;
  /** Names of projects the message mentions. */
  projects: string[];
}

/**
 * How likely a message needs the person, and why, in words shown next to it. Every reason is something
 * real in the data (wording, sender, project link), so the list can always explain itself.
 */
export function scoreMessage(m: { subject: string | null; snippet: string; fromAddress: string | null }, s: MessageSignals): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (URGENT.test(`${m.subject ?? ""} ${m.snippet}`)) {
    score += 3;
    reasons.push("Urgent wording");
  }
  if (s.fromTeammate) {
    score += 2;
    reasons.push("From your team");
  }
  if (s.projects.length) {
    score += 2;
    reasons.push(`About ${s.projects[0]}`);
  }
  if (m.subject?.includes("?")) {
    score += 1;
    reasons.push("Asks a question");
  }
  if (m.fromAddress && AUTOMATED.test(m.fromAddress)) score -= 2;
  return { score, reasons };
}

export interface ImportantMessage {
  id: string;
  provider: string;
  subject: string | null;
  fromName: string | null;
  fromAddress: string | null;
  snippet: string;
  receivedAt: string;
  isUnread: boolean;
  permalink: string | null;
  score: number;
  reasons: string[];
}

/**
 * The messages from the last week that most likely need this person, most important first. Email counts only
 * while unread; chat and app updates have no reliable read state, so recent ones count.
 */
export async function importantMessages(workspaceId: string, userId: string, groups: DataGroupId[], limit: number): Promise<ImportantMessage[]> {
  const providers = [...new Set(groups.flatMap((g) => GROUP_BY_ID[g].providers))];
  if (!providers.length) return [];
  const rows = await db.syncedMessage.findMany({
    where: {
      workspaceId,
      userId,
      provider: { in: providers },
      receivedAt: { gte: new Date(Date.now() - LOOKBACK_MS) },
      OR: [{ isUnread: true }, { provider: { notIn: EMAIL_PROVIDERS } }],
    },
    orderBy: { receivedAt: "desc" },
    take: 300,
  });
  if (!rows.length) return [];

  const links = await db.entityLink.findMany({
    where: { workspaceId, fromType: "SyncedMessage", fromId: { in: rows.map((r) => r.id) }, relation: { in: ["mentions_project", "from_person"] } },
    select: { fromId: true, toId: true, relation: true },
  });
  const projectIds = [...new Set(links.filter((l) => l.relation === "mentions_project").map((l) => l.toId))];
  const names = new Map(
    projectIds.length ? (await db.project.findMany({ where: { workspaceId, id: { in: projectIds } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]) : [],
  );
  const signals = new Map<string, MessageSignals>();
  for (const l of links) {
    const s = signals.get(l.fromId) ?? { fromTeammate: false, projects: [] };
    // A message the person sent themselves isn't "from your team".
    if (l.relation === "from_person" && l.toId !== userId) s.fromTeammate = true;
    if (l.relation === "mentions_project" && names.has(l.toId)) s.projects.push(names.get(l.toId)!);
    signals.set(l.fromId, s);
  }

  return rows
    .map((m) => ({ m, ...scoreMessage(m, signals.get(m.id) ?? { fromTeammate: false, projects: [] }) }))
    .filter((x) => x.score >= IMPORTANT_MIN)
    .sort((a, b) => b.score - a.score || b.m.receivedAt.getTime() - a.m.receivedAt.getTime())
    .slice(0, limit)
    .map(({ m, score, reasons }) => ({
      id: m.id, provider: m.provider, subject: m.subject, fromName: m.fromName, fromAddress: m.fromAddress, snippet: m.snippet,
      receivedAt: m.receivedAt.toISOString(), isUnread: m.isUnread, permalink: m.permalink, score, reasons,
    }));
}

export interface AttentionCounts {
  /** Important messages across the Inbox. */
  inbox: number;
  /** Open tasks assigned to the person (or from their apps) due by the end of their day, overdue included. */
  work: number;
  /** Inbox tabs the person has a connected app for, each with its important-message count. */
  groups: { id: DataGroupId; count: number }[];
}

export async function attentionCounts(workspaceId: string, userId: string, dayEnd: Date): Promise<AttentionCounts> {
  const [connections, stackTasks, appTasks] = await Promise.all([
    db.integration.findMany({ where: { workspaceId, userId }, select: { provider: true } }),
    db.task.count({ where: { workspaceId, assigneeId: userId, status: { not: "Done" }, dueDate: { lte: dayEnd } } }),
    db.syncedTask.count({ where: { workspaceId, userId, isDone: false, dueAt: { lte: dayEnd } } }),
  ]);
  const connected = new Set(connections.map((c) => c.provider));
  const groupIds = INBOX_GROUPS.filter((g) => g.providers.some((p) => connected.has(p))).map((g) => g.id);
  const important = await importantMessages(workspaceId, userId, groupIds, 999);
  const groups = groupIds.map((id) => ({ id, count: important.filter((m) => GROUP_BY_ID[id].providers.includes(m.provider)).length }));
  return { inbox: important.length, work: stackTasks + appTasks, groups };
}

