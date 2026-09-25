import { db } from "@/server/db";

export const IGNORE_PREFIX = "ignored:";

/**
 * Work memory: durable, user-visible facts STACK has noticed in the user's own synced data
 * (e.g. people they hear from often). Derived only from real rows; the user can delete any of
 * them, and a deleted fact is remembered as "ignored" so it is never quietly re-added.
 */
export async function refreshMemory(workspaceId: string, userId: string): Promise<number> {
  const [messages, ignored] = await Promise.all([
    db.syncedMessage.findMany({
      where: { workspaceId, userId, fromAddress: { not: null } },
      select: { fromAddress: true, fromName: true },
      take: 500,
      orderBy: { receivedAt: "desc" },
    }),
    db.memoryItem.findMany({ where: { workspaceId, userId, key: { startsWith: IGNORE_PREFIX } }, select: { key: true } }),
  ]);
  const skip = new Set(ignored.map((i) => i.key.slice(IGNORE_PREFIX.length)));
  const me = (await db.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email?.toLowerCase();

  const counts = new Map<string, { name: string; count: number }>();
  for (const m of messages) {
    const email = m.fromAddress!.toLowerCase();
    if (email === me) continue;
    const cur = counts.get(email) ?? { name: m.fromName ?? email, count: 0 };
    cur.count++;
    counts.set(email, cur);
  }

  let written = 0;
  for (const [email, { name, count }] of counts) {
    if (count < 3) continue;
    const key = `person:${email}`;
    if (skip.has(key)) continue;
    await db.memoryItem.upsert({
      where: { workspaceId_userId_key: { workspaceId, userId, key } },
      create: { workspaceId, userId, key, value: { name, email, recentMessages: count } },
      update: { value: { name, email, recentMessages: count } },
    });
    written++;
  }
  return written;
}
