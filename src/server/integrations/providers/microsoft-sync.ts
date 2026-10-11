import type { CalendarEvent, ConnectedTokens, IncrementalSyncResult, MailMessage, ProviderFile, SyncDelta } from "../provider";
import { fetchJson, ProviderHttpError } from "../http";

/*
 * Incremental Microsoft 365 sync with Microsoft Graph delta queries (learn.microsoft.com/graph/delta-query-overview):
 * - Outlook mail: messages/delta on the Inbox, limited to recent mail. Each round is followed with @odata.nextLink
 *   until an @odata.deltaLink comes back; that link is the cursor for the next run. Removed or moved-out messages
 *   arrive as `@removed`. An expired state token (410, or syncStateNotFound) restarts from scratch.
 * - OneDrive: driveItem delta. The first run takes `token=latest` (changes from now on) plus a bounded read of what's
 *   there; later runs apply changes, dropping items with the `deleted` facet. Folders are skipped.
 * - Calendar: like Google, a fixed calendarView window is re-read each run (delta can't be bounded to a window).
 */

const GRAPH = "https://graph.microsoft.com/v1.0";

export const MS_LIMITS = {
  mailDays: 90,
  mailPageSize: 50,
  /** Pages per run; the rest of a long first round continues next run from the saved nextLink. */
  mailPages: 4,
  /** Partial updates (e.g. read/unread) are re-read in full, up to this many per run. */
  mailRefetch: 50,
  drivePages: 5,
  driveFull: 50,
  calendarPages: 4,
  calendarPastDays: 7,
  calendarFutureDays: 30,
};

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- Graph responses are untyped JSON
const auth = (t: ConnectedTokens, extra: Record<string, string> = {}) => ({ headers: { Authorization: `Bearer ${t.accessToken}`, ...extra } });

/** A stored cursor is only ever followed back to Graph itself - never anywhere a token could leak to. */
const isGraphUrl = (u: string | undefined): u is string => !!u && u.startsWith(`${GRAPH}/`);

/** Graph signals "this sync state is gone, start over" with 410 Gone or a 4xx naming the sync state. */
const isResync = (err: unknown) => err instanceof ProviderHttpError && (err.status === 410 || /syncStateNotFound|syncStateInvalid|resyncRequired/i.test(err.message));

// ---------- mappers ----------

const MAIL_SELECT = "subject,from,bodyPreview,receivedDateTime,isRead,webLink";

export function toMailMessage(m: Json): MailMessage {
  const from = m.from?.emailAddress as { name?: string; address?: string } | undefined;
  return {
    id: m.id,
    subject: m.subject || "(no subject)",
    from: from?.name ?? from?.address ?? "unknown",
    fromAddress: from?.address,
    snippet: m.bodyPreview ?? "",
    receivedAt: m.receivedDateTime,
    isUnread: m.isRead === false,
    permalink: m.webLink,
  };
}

export function toProviderFile(f: Json): ProviderFile {
  return {
    id: f.id,
    name: f.name,
    url: f.webUrl ?? "",
    modifiedAt: f.lastModifiedDateTime,
    mimeType: f.file?.mimeType,
    ownerName: f.lastModifiedBy?.user?.displayName,
  };
}

export function toCalendarEvent(e: Json): CalendarEvent {
  // Asked for in UTC (Prefer: outlook.timezone="UTC"), returned without an offset - so add the Z.
  const utc = (d?: string) => (d ? (/[zZ]|[+-]\d\d:\d\d$/.test(d) ? d : `${d}Z`) : new Date().toISOString());
  return {
    id: e.id,
    title: e.subject || "(no title)",
    start: utc(e.start?.dateTime),
    end: utc(e.end?.dateTime),
    location: e.location?.displayName || undefined,
    organizer: e.organizer?.emailAddress?.address,
    attendees: ((e.attendees ?? []) as Json[]).map((a) => a.emailAddress?.address).filter((a): a is string => !!a),
  };
}

// ---------- Outlook mail ----------

function firstMailUrl(now: Date) {
  const since = new Date(now.getTime() - MS_LIMITS.mailDays * 86_400_000).toISOString();
  const url = new URL(`${GRAPH}/me/mailFolders/inbox/messages/delta`);
  url.searchParams.set("$select", MAIL_SELECT);
  url.searchParams.set("$filter", `receivedDateTime ge ${since}`);
  return url.toString();
}

export async function syncOutlookMail(tokens: ConnectedTokens, cursor: string | undefined, now = new Date()): Promise<{ delta: SyncDelta<MailMessage>; cursor: string }> {
  const headers = { Prefer: `odata.maxpagesize=${MS_LIMITS.mailPageSize}` };
  let url = isGraphUrl(cursor) ? cursor : firstMailUrl(now);
  const upserts = new Map<string, MailMessage>();
  const partial = new Set<string>();
  const deleted = new Set<string>();
  let restarted = false;

  for (let page = 0; page < MS_LIMITS.mailPages; page++) {
    let data: Json;
    try {
      data = await fetchJson<Json>("Outlook mail", url, auth(tokens, headers));
    } catch (err) {
      if (isResync(err) && !restarted) {
        restarted = true;
        url = firstMailUrl(now);
        page = -1;
        continue;
      }
      throw err;
    }
    for (const m of (data.value ?? []) as Json[]) {
      if (m["@removed"]) {
        deleted.add(m.id);
        upserts.delete(m.id);
        partial.delete(m.id);
      } else if (m.receivedDateTime) {
        deleted.delete(m.id);
        partial.delete(m.id);
        upserts.set(m.id, toMailMessage(m));
      } else {
        // An update carrying only the changed fields (e.g. read/unread): re-read it rather than blank the rest.
        deleted.delete(m.id);
        partial.add(m.id);
      }
    }
    if (data["@odata.deltaLink"]) {
      url = data["@odata.deltaLink"];
      break;
    }
    if (!data["@odata.nextLink"]) break;
    url = data["@odata.nextLink"];
  }

  for (const id of [...partial].slice(0, MS_LIMITS.mailRefetch)) {
    if (upserts.has(id)) continue;
    try {
      upserts.set(id, toMailMessage(await fetchJson<Json>("Outlook message", `${GRAPH}/me/messages/${encodeURIComponent(id)}?$select=${MAIL_SELECT}`, auth(tokens))));
    } catch (err) {
      if (err instanceof ProviderHttpError && err.status === 404) deleted.add(id);
      else throw err;
    }
  }
  if (!isGraphUrl(url)) throw new Error("Microsoft Graph returned an unexpected sync link.");
  return { delta: { upserts: [...upserts.values()], deletedIds: [...deleted], full: false }, cursor: url };
}

// ---------- OneDrive ----------

async function oneDriveFresh(tokens: ConnectedTokens): Promise<{ delta: SyncDelta<ProviderFile>; cursor: string }> {
  // Take "changes from now on" first, so nothing that changes during the read is missed next time.
  const latest = await fetchJson<Json>("OneDrive delta", `${GRAPH}/me/drive/root/delta?token=latest`, auth(tokens));
  const link = latest["@odata.deltaLink"];
  if (!isGraphUrl(link)) throw new Error("Microsoft Graph returned an unexpected sync link.");
  const list = await fetchJson<Json>(
    "OneDrive files",
    `${GRAPH}/me/drive/root/children?$top=${MS_LIMITS.driveFull}&$select=id,name,webUrl,lastModifiedDateTime,file,folder,lastModifiedBy`,
    auth(tokens),
  );
  const files = ((list.value ?? []) as Json[]).filter((f) => f.file && !f.folder).map(toProviderFile);
  return { delta: { upserts: files, deletedIds: [], full: true }, cursor: link };
}

export async function syncOneDrive(tokens: ConnectedTokens, cursor: string | undefined): Promise<{ delta: SyncDelta<ProviderFile>; cursor: string }> {
  if (!isGraphUrl(cursor)) return oneDriveFresh(tokens);
  const upserts = new Map<string, ProviderFile>();
  const deleted = new Set<string>();
  let url = cursor;
  for (let page = 0; page < MS_LIMITS.drivePages; page++) {
    let data: Json;
    try {
      data = await fetchJson<Json>("OneDrive delta", url, auth(tokens));
    } catch (err) {
      if (isResync(err)) return oneDriveFresh(tokens);
      throw err;
    }
    // The same item can appear more than once; the last occurrence wins.
    for (const item of (data.value ?? []) as Json[]) {
      if (item.deleted) {
        deleted.add(item.id);
        upserts.delete(item.id);
      } else if (item.file) {
        deleted.delete(item.id);
        upserts.set(item.id, toProviderFile(item));
      }
    }
    if (data["@odata.deltaLink"]) {
      url = data["@odata.deltaLink"];
      break;
    }
    if (!data["@odata.nextLink"]) break;
    url = data["@odata.nextLink"];
  }
  if (!isGraphUrl(url)) throw new Error("Microsoft Graph returned an unexpected sync link.");
  return { delta: { upserts: [...upserts.values()], deletedIds: [...deleted], full: false }, cursor: url };
}

// ---------- Calendar ----------

export async function syncOutlookCalendar(tokens: ConnectedTokens, now = new Date()): Promise<SyncDelta<CalendarEvent>> {
  const start = new Date(now.getTime() - MS_LIMITS.calendarPastDays * 86_400_000).toISOString();
  const end = new Date(now.getTime() + MS_LIMITS.calendarFutureDays * 86_400_000).toISOString();
  let url: string | undefined =
    `${GRAPH}/me/calendarView?startDateTime=${start}&endDateTime=${end}&$select=id,subject,start,end,location,organizer,attendees,isCancelled&$orderby=start/dateTime&$top=100`;
  const events: CalendarEvent[] = [];
  for (let page = 0; page < MS_LIMITS.calendarPages && url; page++) {
    const data: Json = await fetchJson<Json>("Outlook calendar", url, auth(tokens, { Prefer: 'outlook.timezone="UTC"' }));
    for (const e of (data.value ?? []) as Json[]) if (!e.isCancelled) events.push(toCalendarEvent(e));
    const next = data["@odata.nextLink"];
    url = isGraphUrl(next) ? next : undefined;
  }
  // A window that didn't fit in the page budget isn't complete, so it mustn't be used to remove anything.
  return { upserts: events, deletedIds: [], full: !url };
}

/** Mail, files and calendar sync independently: one failing (e.g. no OneDrive licence) doesn't stop the others. */
export async function microsoftSyncIncremental(tokens: ConnectedTokens, cursors: Record<string, string>): Promise<IncrementalSyncResult> {
  const [mail, files, events] = await Promise.allSettled([syncOutlookMail(tokens, cursors["outlook-mail"]), syncOneDrive(tokens, cursors.onedrive), syncOutlookCalendar(tokens)]);
  const result: IncrementalSyncResult = { cursors: {}, errors: [] };
  if (mail.status === "fulfilled") {
    result.messages = mail.value.delta;
    result.cursors["outlook-mail"] = mail.value.cursor;
  } else result.errors!.push(mail.reason);
  if (files.status === "fulfilled") {
    result.files = files.value.delta;
    result.cursors.onedrive = files.value.cursor;
  } else result.errors!.push(files.reason);
  if (events.status === "fulfilled") result.events = events.value;
  else result.errors!.push(events.reason);
  return result;
}
