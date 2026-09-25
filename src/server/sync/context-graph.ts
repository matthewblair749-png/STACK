import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

const MIN_PROJECT_NAME_LENGTH = 4;

function normalize(text: string | null | undefined): string {
  return (text ?? "").toLowerCase();
}

/**
 * Rule-based (not LLM-based, for cost/latency) context-graph builder. Links
 * real synced content to real Task/Project rows via simple heuristics:
 * project-name substring matches, and exact email matches for "from a
 * person." Writes are idempotent via `skipDuplicates` on the EntityLink
 * unique tuple, so this can safely re-run after every sync.
 */
export async function buildContextGraph(workspaceId: string): Promise<{ linksCreated: number }> {
  const [projects, tasks, members, messages, events, files] = await Promise.all([
    db.project.findMany({ where: { workspaceId }, select: { id: true, name: true } }),
    db.task.findMany({ where: { workspaceId }, select: { id: true, title: true } }),
    db.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true, user: { select: { email: true } } },
    }),
    db.syncedMessage.findMany({
      where: { workspaceId },
      orderBy: { receivedAt: "desc" },
      take: 300,
      select: { id: true, subject: true, snippet: true, fromAddress: true },
    }),
    db.syncedEvent.findMany({
      where: { workspaceId },
      orderBy: { startAt: "desc" },
      take: 300,
      select: { id: true, title: true, description: true, attendees: true, organizer: true },
    }),
    db.syncedFile.findMany({
      where: { workspaceId },
      orderBy: { modifiedAt: "desc" },
      take: 300,
      select: { id: true, name: true },
    }),
  ]);

  const memberEmails = new Map(
    members.filter((m) => m.user.email).map((m) => [normalize(m.user.email), m.userId])
  );
  const namedProjects = projects.filter((p) => p.name.length >= MIN_PROJECT_NAME_LENGTH);

  const links: Prisma.EntityLinkCreateManyInput[] = [];

  function linkMentionsProject(fromType: "SyncedMessage" | "SyncedEvent" | "SyncedFile", fromId: string, haystack: string) {
    const h = normalize(haystack);
    for (const project of namedProjects) {
      if (h.includes(normalize(project.name))) {
        links.push({
          workspaceId,
          fromType,
          fromId,
          toType: "Project",
          toId: project.id,
          relation: "mentions_project",
        });
      }
    }
  }

  function linkMentionsTask(fromType: "SyncedMessage" | "SyncedEvent" | "SyncedFile", fromId: string, haystack: string) {
    const h = normalize(haystack);
    for (const task of tasks) {
      if (task.title.length >= MIN_PROJECT_NAME_LENGTH && h.includes(normalize(task.title))) {
        links.push({
          workspaceId,
          fromType,
          fromId,
          toType: "Task",
          toId: task.id,
          relation: "mentions_task",
        });
      }
    }
  }

  function linkFromPerson(fromType: "SyncedMessage" | "SyncedEvent", fromId: string, emails: (string | null | undefined)[]) {
    for (const email of emails) {
      const userId = email ? memberEmails.get(normalize(email)) : undefined;
      if (userId) {
        links.push({
          workspaceId,
          fromType,
          fromId,
          toType: "Person",
          toId: userId,
          relation: "from_person",
        });
      }
    }
  }

  for (const m of messages) {
    const haystack = `${m.subject ?? ""} ${m.snippet}`;
    linkMentionsProject("SyncedMessage", m.id, haystack);
    linkMentionsTask("SyncedMessage", m.id, haystack);
    linkFromPerson("SyncedMessage", m.id, [m.fromAddress]);
  }
  for (const e of events) {
    const haystack = `${e.title} ${e.description ?? ""}`;
    linkMentionsProject("SyncedEvent", e.id, haystack);
    linkMentionsTask("SyncedEvent", e.id, haystack);
    linkFromPerson("SyncedEvent", e.id, [e.organizer, ...e.attendees]);
  }
  for (const f of files) {
    linkMentionsProject("SyncedFile", f.id, f.name);
    linkMentionsTask("SyncedFile", f.id, f.name);
  }

  if (links.length === 0) return { linksCreated: 0 };

  const result = await db.entityLink.createMany({ data: links, skipDuplicates: true });
  return { linksCreated: result.count };
}
