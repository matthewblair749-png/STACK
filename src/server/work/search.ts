import { db } from "@/server/db";
import { listProviders } from "@/server/integrations/registry";
import type { SearchResponse, SearchResult } from "@/lib/work-types";

const PER_TYPE = 5;
const FREE_MAIL = new Set(["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com"]);
const QUESTION = /^(what|who|when|where|why|how|which|did|does|do|is|are|can|could|should|show|find|catch|prepare|summari[sz]e)\b/i;
const EMAIL_PROVIDERS = new Set(["google", "microsoft"]);

const rank = (title: string, q: string) => {
  const t = title.toLowerCase();
  return t === q ? 0 : t.startsWith(q) ? 1 : t.includes(` ${q}`) ? 2 : 3;
};

function short(s: string | null | undefined, n = 90) {
  return (s ?? "").replace(/\s+/g, " ").slice(0, n);
}

/**
 * Real, instant cross-source search over what STACK actually holds for this user: tasks, projects,
 * teammates, synced email/chat/files/meetings, connected apps, and companies (derived from real
 * sender domains - nothing is invented). Results are grouped by relevance, capped per type.
 */
export async function searchWorkspace(workspaceId: string, userId: string, rawQuery: string): Promise<SearchResponse> {
  const query = rawQuery.trim().slice(0, 120);
  const q = query.toLowerCase();
  const ask = query.length > 3 && (query.endsWith("?") || QUESTION.test(query)) ? query : undefined;
  if (q.length < 2) return { query, ask, results: [] };

  const like = { contains: query, mode: "insensitive" as const };
  const [tasks, projects, members, messages, files, events, domainMessages] = await Promise.all([
    db.task.findMany({ where: { workspaceId, title: like }, take: PER_TYPE * 2, select: { id: true, title: true, status: true, dueDate: true } }),
    db.project.findMany({ where: { workspaceId, name: like }, take: PER_TYPE, select: { id: true, name: true, status: true } }),
    db.workspaceMember.findMany({
      where: { workspaceId, user: { OR: [{ name: like }, { email: like }] } },
      take: PER_TYPE,
      select: { userId: true, role: true, user: { select: { name: true, email: true } } },
    }),
    db.syncedMessage.findMany({
      where: { workspaceId, userId, OR: [{ subject: like }, { snippet: like }, { fromName: like }] },
      orderBy: { receivedAt: "desc" },
      take: PER_TYPE * 3,
      select: { id: true, provider: true, subject: true, fromName: true, snippet: true, permalink: true },
    }),
    db.syncedFile.findMany({ where: { workspaceId, userId, name: like }, orderBy: { modifiedAt: "desc" }, take: PER_TYPE, select: { id: true, provider: true, name: true, webUrl: true, ownerName: true } }),
    db.syncedEvent.findMany({ where: { workspaceId, userId, OR: [{ title: like }, { description: like }] }, orderBy: { startAt: "desc" }, take: PER_TYPE, select: { id: true, provider: true, title: true, startAt: true, permalink: true } }),
    db.syncedMessage.findMany({ where: { workspaceId, userId, fromAddress: like }, take: 60, select: { fromAddress: true, fromName: true } }),
  ]);

  const results: SearchResult[] = [];

  for (const t of tasks.sort((a, b) => rank(a.title, q) - rank(b.title, q)).slice(0, PER_TYPE)) {
    results.push({ id: t.id, type: "task", title: t.title, subtitle: `Task - ${t.status === "InProgress" ? "in progress" : t.status.toLowerCase()}${t.dueDate ? ` - due ${t.dueDate.toLocaleDateString()}` : ""}`, href: "/tasks" });
  }
  for (const p of projects) {
    results.push({ id: p.id, type: "project", title: p.name, subtitle: `Project - ${p.status}`, href: `/projects/${p.id}` });
  }
  for (const m of members) {
    results.push({ id: m.userId, type: "person", title: m.user.name ?? m.user.email ?? "Teammate", subtitle: m.user.email ?? m.role, href: "/team" });
  }
  for (const m of messages.sort((a, b) => rank(a.subject ?? "", q) - rank(b.subject ?? "", q)).slice(0, PER_TYPE * 2)) {
    const email = EMAIL_PROVIDERS.has(m.provider);
    results.push({
      id: m.id,
      type: email ? "email" : "message",
      title: m.subject ?? "(no subject)",
      subtitle: `${m.fromName ?? "Unknown"} - ${short(m.snippet, 70)}`,
      appId: m.provider,
      href: m.permalink ?? "/inbox",
      external: !!m.permalink,
    });
  }
  for (const f of files) {
    results.push({ id: f.id, type: "file", title: f.name, subtitle: f.ownerName ? `File - ${f.ownerName}` : "File", appId: f.provider, href: f.webUrl ?? "/files", external: !!f.webUrl });
  }
  for (const e of events) {
    results.push({ id: e.id, type: "meeting", title: e.title, subtitle: `Meeting - ${e.startAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`, appId: e.provider, href: e.permalink ?? "/calendar", external: !!e.permalink });
  }

  // Companies / customers: real sender domains (work domains only), grouped.
  const companies = new Map<string, { name: string; count: number }>();
  for (const m of domainMessages) {
    const domain = m.fromAddress?.split("@")[1]?.toLowerCase();
    if (!domain || FREE_MAIL.has(domain)) continue;
    const cur = companies.get(domain) ?? { name: domain.split(".")[0].replace(/^./, (c) => c.toUpperCase()), count: 0 };
    cur.count++;
    companies.set(domain, cur);
  }
  for (const [domain, c] of [...companies].slice(0, 3)) {
    results.push({ id: domain, type: "company", title: c.name, subtitle: `Company - ${c.count} message${c.count === 1 ? "" : "s"} from ${domain}`, href: `/messages?q=${encodeURIComponent(domain)}` });
  }

  for (const p of listProviders()) {
    if (p.label.toLowerCase().includes(q)) results.push({ id: p.id, type: "app", title: p.label, subtitle: "Connected apps", appId: p.id, href: "/integrations" });
  }

  return { query, ask, results };
}
