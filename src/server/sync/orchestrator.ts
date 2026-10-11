import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { getProvider } from "@/server/integrations/registry";
import { getFreshTokens, IntegrationAuthError } from "@/server/integrations/tokens";
import type { CalendarEvent, ConnectedTokens, MailMessage, ProviderFile, SyncDelta } from "@/server/integrations/provider";
import { buildContextGraph } from "./context-graph";
import { computeInsights } from "@/server/insights/compute";
import { refreshMemory } from "@/server/work/memory";
import { friendlyProviderError } from "@/server/integrations/errors";

export interface ProviderSyncResult {
  provider: string;
  messages?: number;
  events?: number;
  files?: number;
  error?: string;
  /** The failure won't fix itself by retrying (revoked access, app no longer supported) - the person must act. */
  permanent?: boolean;
}

/**
 * How long synced copies are kept. STACK keeps recent working context, not an archive: older mail and anything
 * past these caps is deleted from STACK (never from the source app), and disconnecting deletes all of it.
 */
export const RETENTION = { messageDays: 90, maxMessagesPerConnection: 1000, maxFilesPerConnection: 1000 };

/**
 * Turns provider API failures into something a person can act on. The common one: the API isn't
 * enabled in the app's Google Cloud project - Google's raw JSON is unreadable, so say what to do.
 */
const msg = (providerId: string, err: unknown) => {
  // The raw provider error is for whoever runs STACK (server logs); people get a sentence they can act on.
  console.warn(`sync ${providerId} failed:`, err instanceof Error ? err.message.replace(/\s+/g, " ").slice(0, 500) : err);
  return friendlyProviderError(getProvider(providerId)?.label ?? providerId, err);
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

type Key = { workspaceId: string; userId: string; provider: string };

/** What to remove for a delta: the ids that disappeared upstream, or - for a complete set - everything not in it. */
const removalWhere = (key: Key, delta: SyncDelta<{ id: string }>) =>
  delta.full ? { ...key, externalId: { notIn: delta.upserts.map((u) => u.id) } } : delta.deletedIds.length ? { ...key, externalId: { in: delta.deletedIds } } : null;

async function applyMessages(key: Key, delta: SyncDelta<MailMessage>) {
  const rows: Prisma.SyncedMessageCreateManyInput[] = delta.upserts.map((m) => ({
    ...key,
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
    findExisting: (ids) => db.syncedMessage.findMany({ where: { ...key, externalId: { in: ids } }, select: { id: true, externalId: true, isUnread: true, snippet: true, subject: true } }),
    createMany: (r) => db.syncedMessage.createMany({ data: r, skipDuplicates: true }),
    update: (id, r) => db.syncedMessage.update({ where: { id }, data: { isUnread: r.isUnread, snippet: r.snippet, subject: r.subject } }),
    changed: (e, r) => e.isUnread !== r.isUnread || e.snippet !== r.snippet || e.subject !== r.subject,
  });
  const where = removalWhere(key, delta);
  if (where) await db.syncedMessage.deleteMany({ where });
  return rows.length;
}

async function applyEvents(key: Key, delta: SyncDelta<CalendarEvent>) {
  const rows: Prisma.SyncedEventCreateManyInput[] = delta.upserts.map((e) => ({
    ...key,
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
    findExisting: (ids) => db.syncedEvent.findMany({ where: { ...key, externalId: { in: ids } }, select: { id: true, externalId: true, title: true, startAt: true, endAt: true, location: true } }),
    createMany: (r) => db.syncedEvent.createMany({ data: r, skipDuplicates: true }),
    update: (id, r) => db.syncedEvent.update({ where: { id }, data: { title: r.title, startAt: r.startAt, endAt: r.endAt, location: r.location, attendees: r.attendees, organizer: r.organizer } }),
    changed: (e, r) => e.title !== r.title || e.startAt.getTime() !== new Date(r.startAt as Date).getTime() || e.endAt.getTime() !== new Date(r.endAt as Date).getTime() || (e.location ?? null) !== (r.location ?? null),
  });
  const where = removalWhere(key, delta);
  if (where) await db.syncedEvent.deleteMany({ where });
  return rows.length;
}

async function applyFiles(key: Key, delta: SyncDelta<ProviderFile>) {
  const rows: Prisma.SyncedFileCreateManyInput[] = delta.upserts.map((f) => ({
    ...key,
    externalId: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webUrl: f.url,
    ownerName: f.ownerName,
    modifiedAt: new Date(f.modifiedAt),
  }));
  await saveBatch({
    rows,
    findExisting: (ids) => db.syncedFile.findMany({ where: { ...key, externalId: { in: ids } }, select: { id: true, externalId: true, name: true, modifiedAt: true } }),
    createMany: (r) => db.syncedFile.createMany({ data: r, skipDuplicates: true }),
    update: (id, r) => db.syncedFile.update({ where: { id }, data: { name: r.name, modifiedAt: r.modifiedAt, webUrl: r.webUrl, ownerName: r.ownerName } }),
    changed: (e, r) => e.name !== r.name || e.modifiedAt.getTime() !== new Date(r.modifiedAt as Date).getTime(),
  });
  const where = removalWhere(key, delta);
  if (where) await db.syncedFile.deleteMany({ where });
  return rows.length;
}

/** Enforces RETENTION for one connection. Bounded: only ever looks past the cap, never scans everything. */
async function applyRetention(key: Key) {
  const cutoff = new Date(Date.now() - RETENTION.messageDays * 86_400_000);
  const [overMessages, overFiles] = await Promise.all([
    db.syncedMessage.findMany({ where: key, orderBy: { receivedAt: "desc" }, skip: RETENTION.maxMessagesPerConnection, select: { id: true }, take: 5000 }),
    db.syncedFile.findMany({ where: key, orderBy: { modifiedAt: "desc" }, skip: RETENTION.maxFilesPerConnection, select: { id: true }, take: 5000 }),
  ]);
  await Promise.all([
    db.syncedMessage.deleteMany({ where: { ...key, receivedAt: { lt: cutoff } } }),
    overMessages.length ? db.syncedMessage.deleteMany({ where: { id: { in: overMessages.map((m) => m.id) } } }) : undefined,
    overFiles.length ? db.syncedFile.deleteMany({ where: { id: { in: overFiles.map((f) => f.id) } } }) : undefined,
  ]);
}

/** Syncs one connection: incrementally when the provider supports it, otherwise a bounded recent read. */
export async function syncOneProvider(workspaceId: string, userId: string, providerId: string): Promise<ProviderSyncResult> {
  const provider = getProvider(providerId);
  if (!provider) return { provider: providerId, error: "STACK no longer supports this app. Disconnect it in Connected Apps.", permanent: true };

  let tokens: ConnectedTokens;
  try {
    tokens = await getFreshTokens(workspaceId, userId, providerId);
  } catch (err) {
    return { provider: providerId, error: msg(providerId, err), permanent: err instanceof IntegrationAuthError };
  }

  // STACK's own developer app is only needed for the sign-in (OAuth) flow. A connection made with the
  // person's own token never touches it, so it must not be blocked when that app isn't set up.
  const viaToken = tokens.metadata?.method === "token";
  if (!viaToken && !provider.isConfigured()) return { provider: providerId, error: `${provider.label} sign-in isn't available in STACK right now. Try again later.` };

  const key: Key = { workspaceId, userId, provider: providerId };
  const result: ProviderSyncResult = { provider: providerId };
  const errors: unknown[] = [];

  if (provider.syncIncremental) {
    const integration = await db.integration.findUnique({
      where: { workspaceId_userId_provider: { workspaceId, userId, provider: providerId } },
      select: { id: true, cursors: { select: { resource: true, cursor: true } } },
    });
    if (!integration) return { provider: providerId, error: `${provider.label} is not connected.`, permanent: true };
    const cursors = Object.fromEntries(integration.cursors.map((c) => [c.resource, c.cursor]));

    let delta;
    try {
      delta = await provider.syncIncremental(tokens, cursors);
    } catch (err) {
      return { provider: providerId, error: msg(providerId, err) };
    }
    errors.push(...(delta.errors ?? []));
    const applied = await Promise.allSettled([
      delta.messages ? applyMessages(key, delta.messages).then((n) => (result.messages = n)) : undefined,
      delta.events ? applyEvents(key, delta.events).then((n) => (result.events = n)) : undefined,
      delta.files ? applyFiles(key, delta.files).then((n) => (result.files = n)) : undefined,
    ]);
    const applyFailed = applied.filter((a): a is PromiseRejectedResult => a.status === "rejected");
    errors.push(...applyFailed.map((a) => a.reason));
    // Cursors move forward only once the data they cover is safely stored; otherwise the next run re-reads it
    // (writes are idempotent on the provider's ids, so re-reading never creates duplicates).
    if (!applyFailed.length) {
      await Promise.all(
        Object.entries(delta.cursors).map(([resource, cursor]) =>
          db.syncCursor.upsert({
            where: { integrationId_resource: { integrationId: integration.id, resource } },
            create: { integrationId: integration.id, resource, cursor },
            update: { cursor },
          }),
        ),
      );
    }
  } else {
    // Providers without change tracking: read what's recent and save it (no removals, since it isn't a full set).
    const reads = await Promise.allSettled([
      provider.getMessages ? provider.getMessages(tokens).then((items) => applyMessages(key, { upserts: items, deletedIds: [], full: false }).then((n) => (result.messages = n))) : undefined,
      provider.getCalendarEvents ? provider.getCalendarEvents(tokens).then((items) => applyEvents(key, { upserts: items, deletedIds: [], full: false }).then((n) => (result.events = n))) : undefined,
      provider.getFiles ? provider.getFiles(tokens).then((items) => applyFiles(key, { upserts: items, deletedIds: [], full: false }).then((n) => (result.files = n))) : undefined,
    ]);
    errors.push(...reads.filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => r.reason));
  }

  await applyRetention(key).catch((e) => console.error("retention prune failed", providerId, e));

  // Messages, events and files usually fail for the same reason - say it once.
  if (errors.length) result.error = [...new Set(errors.map((e) => msg(providerId, e)))].join(" ");
  return result;
}

/** Records what happened for a connection, so its health and last sync survive a reload. */
export async function recordSyncResult(workspaceId: string, userId: string, r: ProviderSyncResult, at = new Date()) {
  await db.integration.updateMany({
    where: { workspaceId, userId, provider: r.provider },
    data: { lastSyncAttemptAt: at, lastSyncError: r.error ?? null, ...(r.error ? {} : { lastSyncAt: at }) },
  });
}

/** Rebuilds what's derived from synced content (links, insights, memory) after one or more syncs. */
export async function afterSync(workspaceId: string, userId: string) {
  // The graph must exist before insights read it; insights and memory are independent of each other.
  const graph = await buildContextGraph(workspaceId);
  const [insights] = await Promise.all([
    computeInsights(workspaceId, userId),
    refreshMemory(workspaceId, userId).catch((e) => console.error("refreshMemory failed", e)),
  ]);
  return { graph, insights };
}

export async function syncWorkspaceIntegrations(workspaceId: string, userId: string) {
  const integrations = await db.integration.findMany({ where: { workspaceId, userId }, select: { provider: true } });

  // Every connected app syncs at the same time, not one after another.
  const perProvider = await Promise.all(
    integrations.map((i) =>
      syncOneProvider(workspaceId, userId, i.provider).catch((err): ProviderSyncResult => ({ provider: i.provider, error: msg(i.provider, err) })),
    ),
  );

  const attemptedAt = new Date();
  await Promise.all(perProvider.map((p) => recordSyncResult(workspaceId, userId, p, attemptedAt)));

  const { graph, insights } = await afterSync(workspaceId, userId);
  return { perProvider, graph, insights };
}
