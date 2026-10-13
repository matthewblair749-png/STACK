"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ListPlus, Sparkles } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { ActionCard, type PendingActionData } from "@/components/app/action-card";
import { VirtualList } from "@/components/app/virtual-list";
import { useToast } from "@/components/app/toast";
import { useSyncedList } from "@/lib/use-synced-list";
import type { DataGroupId } from "@/lib/data-groups";
import { cn } from "@/lib/utils";
import { EmptySynced, ErrorNote, ListSkeleton, PageShell, SearchBox } from "./synced-shared";
import { whenLabel } from "./home-parts";
import { askStackAbout, messageForAi } from "./ask-about";

interface SyncedMessage {
  id: string;
  provider: string;
  subject: string | null;
  fromName: string | null;
  fromAddress: string | null;
  snippet: string;
  receivedAt: string;
  isUnread: boolean;
  permalink: string | null;
}

/** A message the server picked as likely needing the person, with the reasons it shows. */
interface ImportantMessage extends SyncedMessage {
  reasons: string[];
}

/** One Inbox tab: what needs you first, then every real synced message, newest first, windowed and actionable. */
export function MessageList({ group, title, subtitle, noun, initialQuery = "" }: { group: DataGroupId; title: string; subtitle: string; noun: string; initialQuery?: string }) {
  const toast = useToast();
  const [q, setQ] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [proposal, setProposal] = useState<PendingActionData | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const list = useSyncedList<SyncedMessage>("messages", { group, q: debounced || undefined });
  const router = useRouter();
  const [important, setImportant] = useState<ImportantMessage[]>([]);

  const loadImportant = useCallback(() => {
    fetch(`/api/attention/important?group=${group}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((b) => setImportant(b.items ?? []))
      .catch(() => setImportant([]));
  }, [group]);
  useEffect(loadImportant, [loadImportant]);

  const reload = () => {
    list.reload();
    loadImportant();
  };

  const actions = (m: SyncedMessage) => (
    <>
      <button onClick={() => askStackAbout(router.push, messageForAi(m))} title="Ask STACK about this" aria-label="Ask STACK about this" className="rounded-lg p-2 text-neutral-400 hover:bg-blue-soft hover:text-blue"><Sparkles size={16} /></button>
      <button onClick={() => turnIntoTask(m)} title="Turn into a task" aria-label="Turn into a task" className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-ink"><ListPlus size={16} /></button>
      {m.permalink && <a href={m.permalink} target="_blank" rel="noopener noreferrer" title="Open in the original app" aria-label="Open in the original app" className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-ink"><ExternalLink size={16} /></a>}
    </>
  );

  async function turnIntoTask(m: SyncedMessage) {
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "CreateTask", payload: { title: m.subject ?? `Follow up with ${m.fromName ?? "sender"}`, description: `From ${m.fromName ?? "unknown"}: ${m.snippet.slice(0, 300)}` } }),
    });
    const body = await res.json();
    if (res.ok) setProposal(body.action);
    else toast({ title: "Couldn't propose that task", description: body.error, tone: "error" });
  }

  return (
    <PageShell title={title} subtitle={subtitle} onSynced={reload}>
      <SearchBox value={q} onChange={setQ} placeholder={`Search ${noun}...`} />
      {!debounced && important.length > 0 && (
        <section aria-label="Needs you" className="mt-4 shrink-0 rounded-2xl border border-red/20 bg-red-soft/40">
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wider text-red">Needs you</p>
          <ul>
            {important.map((m) => (
              <li key={m.id} className="group flex items-center gap-3 border-b border-red/10 px-4 py-2.5 last:border-b-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white"><IntegrationLogo app={m.provider} name={m.provider} size="md" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-ink">{m.fromName ?? m.fromAddress ?? "Unknown sender"}</p>
                    <span className="shrink-0 text-xs text-neutral-400">{whenLabel(m.receivedAt)}</span>
                  </div>
                  <p className="truncate text-sm text-ink">{m.subject ?? m.snippet}</p>
                  <p className="mt-0.5 flex flex-wrap gap-1">
                    {m.reasons.map((r) => <span key={r} className="rounded-full bg-white px-2 py-px text-[11px] font-medium text-neutral-600">{r}</span>)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">{actions(m)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {proposal && (
        <div className="mt-3 max-w-md shrink-0">
          <ActionCard action={proposal} onResolved={(s) => { if (s === "approved") toast({ title: "Task created", tone: "success" }); setTimeout(() => setProposal(null), 1500); }} />
        </div>
      )}
      {list.loading ? (
        <ListSkeleton />
      ) : list.error ? (
        <ErrorNote onRetry={reload} />
      ) : list.items.length === 0 ? (
        <EmptySynced what={noun} filtered={!!debounced} />
      ) : (
        <VirtualList
          label={title}
          items={list.items}
          rowHeight={80}
          className="mt-4 min-h-0 flex-1 rounded-2xl border border-neutral-100 bg-white"
          getKey={(m) => m.id}
          onEndReached={list.loadMore}
          footer={list.loadingMore ? <p className="py-3 text-center text-xs text-neutral-400">Loading more...</p> : undefined}
          renderRow={(m) => (
            <div className="group flex h-full items-center gap-3 border-b border-neutral-50 px-4 hover:bg-neutral-25">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", m.isUnread ? "bg-blue" : "bg-transparent")} aria-label={m.isUnread ? "Unread" : undefined} />
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-50"><IntegrationLogo app={m.provider} name={m.provider} size="md" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={cn("truncate text-sm text-ink", m.isUnread && "font-semibold")}>{m.fromName ?? m.fromAddress ?? "Unknown sender"}</p>
                  <span className="shrink-0 text-xs text-neutral-400">{whenLabel(m.receivedAt)}</span>
                </div>
                <p className={cn("truncate text-sm", m.isUnread ? "text-ink" : "text-neutral-600")}>{m.subject ?? "(no subject)"}</p>
                <p className="truncate text-xs text-neutral-400">{m.snippet}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                {actions(m)}
              </div>
            </div>
          )}
        />
      )}
    </PageShell>
  );
}
