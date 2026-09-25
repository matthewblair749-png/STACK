"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { VirtualList } from "@/components/app/virtual-list";
import { whenLabel } from "@/components/app/home-parts";
import { EmptySynced, ErrorNote, ListSkeleton, PageShell, SearchBox } from "@/components/app/synced-shared";
import { useSyncedList } from "@/lib/use-synced-list";

interface SyncedFile {
  id: string;
  provider: string;
  name: string;
  mimeType: string | null;
  webUrl: string | null;
  ownerName: string | null;
  modifiedAt: string;
}

export default function FilesPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);
  const list = useSyncedList<SyncedFile>("files", { q: debounced || undefined });

  return (
    <PageShell title="Files" subtitle="Recently modified files across your connected storage." onSynced={list.reload}>
      <SearchBox value={q} onChange={setQ} placeholder="Search files..." />
      {list.loading ? (
        <ListSkeleton />
      ) : list.error ? (
        <ErrorNote onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptySynced what="files" filtered={!!debounced} />
      ) : (
        <VirtualList
          label="Files"
          items={list.items}
          rowHeight={64}
          className="mt-4 min-h-0 flex-1 rounded-2xl border border-neutral-100 bg-white"
          getKey={(f) => f.id}
          onEndReached={list.loadMore}
          footer={list.loadingMore ? <p className="py-3 text-center text-xs text-neutral-400">Loading more...</p> : undefined}
          renderRow={(f) => (
            <div className="flex h-full items-center gap-3 border-b border-neutral-50 px-4 hover:bg-neutral-25">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-50"><FileText size={17} className="text-neutral-400" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{f.name}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-neutral-400"><IntegrationLogo app={f.provider} name={f.provider} size="sm" /> {f.ownerName ? `${f.ownerName} - ` : ""}modified {whenLabel(f.modifiedAt)}</p>
              </div>
              {f.webUrl && <a href={f.webUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${f.name}`} className="shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-ink"><ExternalLink size={16} /></a>}
            </div>
          )}
        />
      )}
    </PageShell>
  );
}
