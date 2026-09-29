"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ListPlus } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { ActionCard, type PendingActionData } from "@/components/app/action-card";
import { VirtualList } from "@/components/app/virtual-list";
import { useToast } from "@/components/app/toast";
import { useSyncedList } from "@/lib/use-synced-list";
import type { DataGroupId } from "@/lib/data-groups";
import { cn } from "@/lib/utils";
import { EmptySynced, ErrorNote, ListSkeleton, PageShell, SearchBox } from "./synced-shared";
import { whenLabel } from "./home-parts";

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

/** Shared by Inbox (email) and Conversations (chat): real synced messages, windowed, actionable. */
export function MessageList({ group, title, subtitle, noun }: { group: DataGroupId; title: string; subtitle: string; noun: string }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [proposal, setProposal] = useState<PendingActionData | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const list = useSyncedList<SyncedMessage>("messages", { group, q: debounced || undefined });

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
    <PageShell title={title} subtitle={subtitle} onSynced={list.reload}>
      <SearchBox value={q} onChange={setQ} placeholder={`Search ${noun}...`} />
      {proposal && (
        <div className="mt-3 max-w-md shrink-0">
          <ActionCard action={proposal} onResolved={(s) => { if (s === "approved") toast({ title: "Task created", tone: "success" }); setTimeout(() => setProposal(null), 1500); }} />
        </div>
      )}
      {list.loading ? (
        <ListSkeleton />
      ) : list.error ? (
        <ErrorNote onRetry={list.reload} />
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
                <button onClick={() => turnIntoTask(m)} title="Turn into a task" aria-label="Turn into a task" className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-ink"><ListPlus size={16} /></button>
                {m.permalink && <a href={m.permalink} target="_blank" rel="noopener noreferrer" title="Open in the original app" aria-label="Open in the original app" className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-ink"><ExternalLink size={16} /></a>}
              </div>
            </div>
          )}
        />
      )}
    </PageShell>
  );
}
