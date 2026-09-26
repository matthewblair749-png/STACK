import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { getProvider } from "@/server/integrations/registry";
import { getFreshTokens } from "@/server/integrations/tokens";
import type { ConnectedTokens } from "@/server/integrations/provider";
import { buildContextGraph } from "./context-graph";
import { computeInsights } from "@/server/insights/compute";
import { refreshMemory } from "@/server/work/memory";

interface ProviderSyncResult {
  provider: string;
  messages?: number;
  events?: number;
  files?: number;
  error?: string;
}

/**
 * Turns provider API failures into something a person can act on. The common one: the API isn't
 * enabled in the app's Google Cloud project - Google's raw JSON is unreadable, so say what to do.
 */
const msg = (err: unknown) => {
  const raw = err instanceof Error ? err.message : String(err);
  if (/SERVICE_DISABLED|accessNotConfigured|has not been used in project/i.test(raw)) {
    const api = raw.match(/"serviceTitle":\s*"([^"]+)"/)?.[1] ?? "A required Google API";
    const url = raw.match(/"activationUrl":\s*"([^"]+)"/)?.[1];
    return `${api} isn't enabled in your Google Cloud project.${url ? ` Enable it at ${url}, wait a minute, then sync again.` : " Enable it in Google Cloud, then sync again."}`;
  }
  if (/\b401\b/.test(raw)) return "Google rejected the saved sign-in. Reconnect Google in Connected Apps.";
  return raw.replace(/\s+/g, " ").slice(0, 300);
};

/**
 * Saves a page of synced rows with a constant number of database round trips (one lookup, one
 * bulk insert, and updates only for rows that actually changed) instead of one upsert per row -
 * which is what made syncing slow against a remote database.
 */
async function saveBatch<Row extends { externalId: string }, Existing extends { id: string; externalId: string }>(args: {
  rows: Row[];
  findExisting: (externalIds: string[]) => Promise<Existing[]>;
  createMany: (rows: Row[]) => Promise<unknown>;
  update: (id: string, row: Row) => Promise<unknown>;
  changed: (existing: Existing, row: Row) => boolean;
}) {
  if (args.rows.length === 0) return;
  const existing = await args.findExisting(args.rows.map((r) => r.externalId));
  const byExternal = new Map(existing.map((e) => [e.externalId, e]));
  const fresh = args.rows.filter((r) => !byExternal.has(r.externalId));
  const stale = args.rows.filter((r) => {
    const e = byExternal.get(r.externalId);
    return e && args.changed(e, r);
  });
  await Promise.all([
    fresh.length ? args.createMany(fresh) : undefined,
    ...stale.map((r) => args.update(byExternal.get(r.externalId)!.id, r)),
  ]);
}

async function syncOneProvider(workspaceId: string, userId: string, providerId: string): Promise<ProviderSyncResult> {
  const provider = getProvider(providerId);
  if (!provider) return { provider: providerId, error: "unknown app" };

  let tokens: ConnectedTokens;
  try {
    tokens = await getFreshTokens(workspaceId, userId, providerId);
  } catch (err) {
    return { provider: providerId, error: msg(err) };
  }

  // STACK's own developer app is only needed for the sign-in (OAuth) flow. A connection made with the
  // person's own token never touches it, so it must not be blocked when that app isn't set up.
  const viaToken = tokens.metadata?.method === "token";
  if (!viaToken && !provider.isConfigured()) return { provider: providerId, error: "not configured" };

  const base = { workspaceId, userId, provider: providerId };
  const inKey = (ids: string[]) => ({ workspaceId, provider: providerId, externalId: { in: ids } });

  // Messages, events and files are independent - fetch and save them at the same time.
  const tasks: Promise<Partial<ProviderSyncResult>>[] = [];

  if (provider.getMessages) {
    tasks.push(
      (async () => {
        try {
          const items = await provider.getMessages!(tokens);
          const rows: Prisma.SyncedMessageCreateManyInput[] = items.map((m) => ({
            ...base,
            externalId: m.id,
            threadExternalId: m.threadId,
            subject: m.subject,
            fromName: m.from,
            fromAddress: m.fromAddress,
            snippet: m.snippet,
            receivedAt: new Date(m.receivedAt),
            isUnread: m.isUnread ?? false,
            permalink: m.permalink,
          }));
          await saveBatch({
            rows,
            findExisting: (ids) => db.syncedMessage.findMany({ where: inKey(ids), select: { id: true, externalId: true, isUnread: true, snippet: true, subject: true } }),
            createMany: (r) => db.syncedMessage.createMany({ data: r, skipDuplicates: true }),
            update: (id, r) => db.syncedMessage.update({ where: { id }, data: { isUnread: r.isUnread, snippet: r.snippet, subject: r.subject } }),
            changed: (e, r) => e.isUnread !== r.isUnread || e.snippet !== r.snippet || e.subject !== r.subject,
          });
          return { messages: rows.length };
        } catch (err) {
          return { error: `messages: ${msg(err)}` };
        }
      })(),
    );
  }

  if (provider.getCalendarEvents) {
    tasks.push(
      (async () => {
        try {
          const items = await provider.getCalendarEvents!(tokens);
          const rows: Prisma.SyncedEventCreateManyInput[] = items.map((e) => ({
            ...base,
            externalId: e.id,
            title: e.title,
            startAt: new Date(e.start),
            endAt: new Date(e.end),
            location: e.location,
            organizer: e.organizer,
            attendees: e.attendees ?? [],
          }));
          await saveBatch({
            rows,
            findExisting: (ids) => db.syncedEvent.findMany({ where: inKey(ids), select: { id: true, externalId: true, title: true, startAt: true, endAt: true, location: true } }),
            createMany: (r) => db.syncedEvent.createMany({ data: r, skipDuplicates: true }),
            update: (id, r) => db.syncedEvent.update({ where: { id }, data: { title: r.title, startAt: r.startAt, endAt: r.endAt, location: r.location, attendees: r.attendees, organizer: r.organizer } }),
            changed: (e, r) => e.title !== r.title || e.startAt.getTime() !== new Date(r.startAt as Date).getTime() || e.endAt.getTime() !== new Date(r.endAt as Date).getTime() || (e.location ?? null) !== (r.location ?? null),
          });
          return { events: rows.length };
        } catch (err) {
          return { error: `events: ${msg(err)}` };
        }
      })(),
    );
  }

  if (provider.getFiles) {
    tasks.push(
      (async () => {
        try {
          const items = await provider.getFiles!(tokens);
          const rows: Prisma.SyncedFileCreateManyInput[] = items.map((f) => ({
            ...base,
            externalId: f.id,
            name: f.name,
            mimeType: f.mimeType,
            webUrl: f.url,
            ownerName: f.ownerName,
            modifiedAt: new Date(f.modifiedAt),
          }));
          await saveBatch({
            rows,
            findExisting: (ids) => db.syncedFile.findMany({ where: inKey(ids), select: { id: true, externalId: true, name: true, modifiedAt: true } }),
            createMany: (r) => db.syncedFile.createMany({ data: r, skipDuplicates: true }),
            update: (id, r) => db.syncedFile.update({ where: { id }, data: { name: r.name, modifiedAt: r.modifiedAt, webUrl: r.webUrl, ownerName: r.ownerName } }),
            changed: (e, r) => e.name !== r.name || e.modifiedAt.getTime() !== new Date(r.modifiedAt as Date).getTime(),
          });
          return { files: rows.length };
        } catch (err) {
          return { error: `files: ${msg(err)}` };
        }
      })(),
    );
  }

  const parts = await Promise.all(tasks);
  const result: ProviderSyncResult = { provider: providerId };
  const errors: string[] = [];
  for (const p of parts) {
    if (p.error) errors.push(p.error);
    if (p.messages !== undefined) result.messages = p.messages;
    if (p.events !== undefined) result.events = p.events;
    if (p.files !== undefined) result.files = p.files;
  }
  if (errors.length) result.error = errors.join("; ");
  return result;
}

export async function syncWorkspaceIntegrations(workspaceId: string, userId: string) {
  const integrations = await db.integration.findMany({ where: { workspaceId, userId }, select: { provider: true } });

  // Every connected app syncs at the same time, not one after another.
  const perProvider = await Promise.all(
    integrations.map((i) =>
      syncOneProvider(workspaceId, userId, i.provider).catch((err): ProviderSyncResult => ({ provider: i.provider, error: msg(err) })),
    ),
  );

  // Record what actually happened for each app, so connection health survives a page reload.
  const attemptedAt = new Date();
  await Promise.all(
    perProvider.map((p) =>
      db.integration.updateMany({
        where: { workspaceId, userId, provider: p.provider },
        data: { lastSyncAttemptAt: attemptedAt, lastSyncError: p.error ?? null, ...(p.error ? {} : { lastSyncAt: attemptedAt }) },
      }),
    ),
  );

  // The graph must exist before insights read it; insights and memory are independent of each other.
  const graph = await buildContextGraph(workspaceId);
  const [insights] = await Promise.all([
    computeInsights(workspaceId, userId),
    refreshMemory(workspaceId, userId).catch((e) => console.error("refreshMemory failed", e)),
  ]);

  return { perProvider, graph, insights };
}
