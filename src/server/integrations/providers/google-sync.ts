import type { CalendarEvent, ConnectedTokens, IncrementalSyncResult, MailMessage, ProviderFile, SyncDelta } from "../provider";
import { fetchJson, ProviderHttpError } from "../http";

/*
 * Incremental Google sync, following Google's documented sync patterns:
 * - Gmail: full read of recent inbox mail, then users.history.list from the stored historyId. A 404 means the
 *   historyId is too old, so a full read starts again (developers.google.com/workspace/gmail/api/guides/sync).
 * - Drive: changes.getStartPageToken before the first read, then changes.list from the stored token; removed or
 *   trashed files are deleted (developers.google.com/workspace/drive/api/guides/manage-changes).
 * - Calendar: syncToken can't be combined with a time window (timeMin/timeMax), and expanding recurring events
 *   without one is unbounded, so STACK re-reads a fixed window each run and drops what left it (reconciliation).
 */

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const DRIVE = "https://www.googleapis.com/drive/v3";
const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/** Bounds on what one run downloads, so a huge mailbox or a long absence can't turn into an unbounded job. */
export const LIMITS = {
  inboxFull: 50,
  historyPages: 3,
  /** More changed messages than this since last time: cheaper and safer to re-read the inbox. */
  historyMessages: 100,
  driveFull: 50,
  drivePages: 5,
  calendarPages: 4,
  calendarPastDays: 7,
  calendarFutureDays: 30,
};

type Json = Record<string, unknown>;
const auth = (t: ConnectedTokens) => ({ headers: { Authorization: `Bearer ${t.accessToken}` } });

/** Run async work over items a few at a time (Gmail metadata calls), to stay under per-user rate limits. */
async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

// ---------- mappers (also used by the provider's one-off get* reads) ----------

export function toMailMessage(data: Json): MailMessage {
  const headerList = ((data.payload as Json | undefined)?.headers as { name: string; value: string }[] | undefined) ?? [];
  const getHeader = (name: string) => headerList.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
  const fromRaw = getHeader("From");
  const fromMatch = fromRaw.match(/<([^>]+)>/);
  return {
    id: data.id as string,
    threadId: data.threadId as string | undefined,
    subject: getHeader("Subject") || "(no subject)",
    from: fromRaw.replace(/<[^>]+>/, "").trim() || fromRaw,
    fromAddress: fromMatch ? fromMatch[1] : fromRaw,
    snippet: (data.snippet as string) ?? "",
    receivedAt: new Date(Number(data.internalDate)).toISOString(),
    isUnread: ((data.labelIds as string[] | undefined) ?? []).includes("UNREAD"),
    permalink: `https://mail.google.com/mail/u/0/#inbox/${data.id}`,
  };
}

export function toCalendarEvent(e: Json): CalendarEvent {
  const start = e.start as { dateTime?: string; date?: string };
  const end = e.end as { dateTime?: string; date?: string };
  const attendees = (e.attendees as { email?: string }[] | undefined) ?? [];
  return {
    id: e.id as string,
    title: (e.summary as string) || "(no title)",
    start: start?.dateTime ?? start?.date ?? new Date().toISOString(),
    end: end?.dateTime ?? end?.date ?? new Date().toISOString(),
    location: e.location as string | undefined,
    organizer: (e.organizer as { email?: string } | undefined)?.email,
    attendees: attendees.map((a) => a.email).filter((a): a is string => !!a),
  };
}

export function toProviderFile(f: Json): ProviderFile {
  const owners = (f.owners as { displayName?: string }[] | undefined) ?? [];
  return {
    id: f.id as string,
    name: f.name as string,
    url: (f.webViewLink as string) ?? "",
    modifiedAt: f.modifiedTime as string,
    mimeType: f.mimeType as string | undefined,
    ownerName: owners[0]?.displayName,
  };
}

// ---------- Gmail ----------

/** Metadata only - never message bodies or attachments. null when the message no longer exists. */
async function getMessageMeta(tokens: ConnectedTokens, id: string): Promise<Json | null> {
  try {
    return await fetchJson<Json>("Gmail message", `${GMAIL}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, auth(tokens));
  } catch (err) {
    if (err instanceof ProviderHttpError && err.status === 404) return null;
    throw err;
  }
}

async function gmailFull(tokens: ConnectedTokens): Promise<{ delta: SyncDelta<MailMessage>; cursor: string }> {
  const list = await fetchJson<{ messages?: { id: string }[] }>("Gmail list", `${GMAIL}/messages?maxResults=${LIMITS.inboxFull}&labelIds=INBOX`, auth(tokens));
  const metas = (await mapLimited(list.messages ?? [], 10, (m) => getMessageMeta(tokens, m.id))).filter((m): m is Json => !!m);
  // Google: store the historyId of the most recent message (the first one listed). An empty inbox uses the mailbox's.
  const cursor = (metas[0]?.historyId as string | undefined) ?? (await fetchJson<{ historyId: string }>("Gmail profile", `${GMAIL}/profile`, auth(tokens))).historyId;
  return { delta: { upserts: metas.map(toMailMessage), deletedIds: [], full: true }, cursor };
}

type HistoryPage = {
  history?: { messagesAdded?: { message: { id: string } }[]; messagesDeleted?: { message: { id: string } }[]; labelsAdded?: { message: { id: string } }[]; labelsRemoved?: { message: { id: string } }[] }[];
  nextPageToken?: string;
  historyId?: string;
};

export async function syncGmail(tokens: ConnectedTokens, cursor: string | undefined): Promise<{ delta: SyncDelta<MailMessage>; cursor: string }> {
  if (!cursor) return gmailFull(tokens);

  const changed = new Set<string>();
  const deleted = new Set<string>();
  let pageToken: string | undefined;
  let latest = cursor;
  for (let page = 0; ; page++) {
    let data: HistoryPage;
    try {
      const url = new URL(`${GMAIL}/history`);
      url.searchParams.set("startHistoryId", cursor);
      url.searchParams.set("maxResults", "500");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      data = await fetchJson<HistoryPage>("Gmail history", url.toString(), auth(tokens));
    } catch (err) {
      // Google: a 404 means the historyId is outside the available range - do a full sync.
      if (err instanceof ProviderHttpError && err.status === 404) return gmailFull(tokens);
      throw err;
    }
    for (const h of data.history ?? []) {
      for (const m of h.messagesDeleted ?? []) {
        deleted.add(m.message.id);
        changed.delete(m.message.id);
      }
      for (const m of [...(h.messagesAdded ?? []), ...(h.labelsAdded ?? []), ...(h.labelsRemoved ?? [])]) {
        if (!deleted.has(m.message.id)) changed.add(m.message.id);
      }
    }
    if (data.historyId) latest = data.historyId;
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    if (page + 1 >= LIMITS.historyPages || changed.size > LIMITS.historyMessages) return gmailFull(tokens);
  }
  if (changed.size > LIMITS.historyMessages) return gmailFull(tokens);

  // History entries carry only ids; re-read each changed message's labels and headers.
  const upserts: MailMessage[] = [];
  const metas = await mapLimited([...changed], 10, async (id) => ({ id, meta: await getMessageMeta(tokens, id) }));
  for (const { id, meta } of metas) {
    const labels = (meta?.labelIds as string[] | undefined) ?? [];
    // STACK mirrors the inbox: gone, or archived out of the inbox, means it's removed here too.
    if (!meta || !labels.includes("INBOX")) deleted.add(id);
    else upserts.push(toMailMessage(meta));
  }
  return { delta: { upserts, deletedIds: [...deleted], full: false }, cursor: latest };
}

// ---------- Drive ----------

const FILE_FIELDS = "id,name,webViewLink,modifiedTime,mimeType,owners(displayName),trashed";

async function driveFull(tokens: ConnectedTokens): Promise<{ delta: SyncDelta<ProviderFile>; cursor: string }> {
  // Take the token first, so nothing that changes during the read is missed next time.
  const { startPageToken } = await fetchJson<{ startPageToken: string }>("Drive start token", `${DRIVE}/changes/startPageToken`, auth(tokens));
  const url = new URL(`${DRIVE}/files`);
  url.searchParams.set("pageSize", String(LIMITS.driveFull));
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("q", "trashed = false");
  url.searchParams.set("fields", `files(${FILE_FIELDS})`);
  const data = await fetchJson<{ files?: Json[] }>("Drive list", url.toString(), auth(tokens));
  return { delta: { upserts: (data.files ?? []).map(toProviderFile), deletedIds: [], full: true }, cursor: startPageToken };
}

type ChangesPage = { changes?: { removed?: boolean; fileId: string; file?: Json & { trashed?: boolean } }[]; nextPageToken?: string; newStartPageToken?: string };

export async function syncDrive(tokens: ConnectedTokens, cursor: string | undefined): Promise<{ delta: SyncDelta<ProviderFile>; cursor: string }> {
  if (!cursor) return driveFull(tokens);
  const upserts = new Map<string, ProviderFile>();
  const deleted = new Set<string>();
  let token = cursor;
  for (let page = 0; page < LIMITS.drivePages; page++) {
    const url = new URL(`${DRIVE}/changes`);
    url.searchParams.set("pageToken", token);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("includeRemoved", "true");
    url.searchParams.set("spaces", "drive");
    url.searchParams.set("fields", `nextPageToken,newStartPageToken,changes(removed,fileId,file(${FILE_FIELDS}))`);
    let data: ChangesPage;
    try {
      data = await fetchJson<ChangesPage>("Drive changes", url.toString(), auth(tokens));
    } catch (err) {
      // A token Drive no longer accepts: start over from a full read.
      if (err instanceof ProviderHttpError && (err.status === 404 || err.status === 410 || err.status === 400)) return driveFull(tokens);
      throw err;
    }
    // Changes arrive oldest first, so a later change to the same file wins.
    for (const c of data.changes ?? []) {
      if (c.removed || !c.file || c.file.trashed) {
        deleted.add(c.fileId);
        upserts.delete(c.fileId);
      } else {
        deleted.delete(c.fileId);
        upserts.set(c.fileId, toProviderFile(c.file));
      }
    }
    if (data.newStartPageToken) return { delta: { upserts: [...upserts.values()], deletedIds: [...deleted], full: false }, cursor: data.newStartPageToken };
    if (!data.nextPageToken) break;
    token = data.nextPageToken;
  }
  // Still more pages: save progress (a nextPageToken is a valid place to continue from) and pick up next run.
  return { delta: { upserts: [...upserts.values()], deletedIds: [...deleted], full: false }, cursor: token };
}

// ---------- Calendar ----------

export async function syncCalendar(tokens: ConnectedTokens, now = new Date()): Promise<SyncDelta<CalendarEvent>> {
  const timeMin = new Date(now.getTime() - LIMITS.calendarPastDays * 86_400_000).toISOString();
  const timeMax = new Date(now.getTime() + LIMITS.calendarFutureDays * 86_400_000).toISOString();
  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < LIMITS.calendarPages; page++) {
    const url = new URL(CALENDAR);
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await fetchJson<{ items?: Json[]; nextPageToken?: string }>("Google Calendar list", url.toString(), auth(tokens));
    for (const e of data.items ?? []) if (e.status !== "cancelled") events.push(toCalendarEvent(e));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  // A window that didn't fit in the page budget isn't complete, so it mustn't be used to remove anything.
  return { upserts: events, deletedIds: [], full: !pageToken };
}

/** Each resource syncs independently: one failing (e.g. Drive API switched off) doesn't stop the others. */
export async function googleSyncIncremental(tokens: ConnectedTokens, cursors: Record<string, string>): Promise<IncrementalSyncResult> {
  const [mail, files, events] = await Promise.allSettled([syncGmail(tokens, cursors.gmail), syncDrive(tokens, cursors.drive), syncCalendar(tokens)]);
  const result: IncrementalSyncResult = { cursors: {}, errors: [] };
  if (mail.status === "fulfilled") {
    result.messages = mail.value.delta;
    result.cursors.gmail = mail.value.cursor;
  } else result.errors!.push(mail.reason);
  if (files.status === "fulfilled") {
    result.files = files.value.delta;
    result.cursors.drive = files.value.cursor;
  } else result.errors!.push(files.reason);
  if (events.status === "fulfilled") result.events = events.value;
  else result.errors!.push(events.reason);
  return result;
}
