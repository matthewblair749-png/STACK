"use client";

import { useMemo } from "react";
import { ExternalLink, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { IntegrationLogo } from "@/components/brand-icons";
import { useSyncedList } from "@/lib/use-synced-list";
import { EmptySynced, ErrorNote, ListSkeleton, PageShell } from "@/components/app/synced-shared";

interface SyncedEvent {
  id: string;
  provider: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string | null;
  attendees: string[];
  permalink: string | null;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function dayLabel(d: Date) {
  const today = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(today)) / 86_400_000);
  const base = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return diff === 0 ? `Today - ${base}` : diff === 1 ? `Tomorrow - ${base}` : base;
}

export default function CalendarPage() {
  const list = useSyncedList<SyncedEvent>("events", {});
  const days = useMemo(() => {
    const map = new Map<string, { label: string; events: SyncedEvent[] }>();
    for (const e of list.items) {
      const d = new Date(e.startAt);
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, { label: dayLabel(d), events: [] });
      map.get(key)!.events.push(e);
    }
    return [...map.values()];
  }, [list.items]);

  return (
    <PageShell title="Calendar" subtitle="Upcoming meetings from your connected calendars." onSynced={list.reload}>
      {list.loading ? (
        <ListSkeleton />
      ) : list.error ? (
        <ErrorNote onRetry={list.reload} />
      ) : list.items.length === 0 ? (
        <EmptySynced what="meetings" />
      ) : (
        <div className="mt-6 min-h-0 flex-1 space-y-8 overflow-y-auto pb-6">
          {days.map((day) => (
            <section key={day.label} aria-label={day.label}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{day.label}</h2>
              <ul className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-white">
                {day.events.map((e) => (
                  <li key={e.id} className="flex items-start gap-4 px-4 py-3.5">
                    <div className="w-24 shrink-0 pt-0.5 text-sm tabular-nums">
                      <p className="font-semibold text-ink">{time(e.startAt)}</p>
                      <p className="text-xs text-neutral-400">{time(e.endAt)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-ink"><IntegrationLogo app={e.provider} name={e.provider} size="sm" /> <span className="truncate">{e.title}</span></p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-neutral-400">
                        {e.location && <span className="flex items-center gap-1"><MapPin size={11} /> {e.location}</span>}
                        {e.attendees.length > 0 && <span>{e.attendees.length} {e.attendees.length === 1 ? "attendee" : "attendees"}</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link href={`/ai?q=${encodeURIComponent(`Prepare me for "${e.title}"`)}`} className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-ink hover:border-ink"><Sparkles size={12} className="text-blue" /> Prepare</Link>
                      {e.permalink && <a href={e.permalink} target="_blank" rel="noopener noreferrer" aria-label="Open in the original app" className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-ink"><ExternalLink size={15} /></a>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {list.hasMore && (
            <button onClick={list.loadMore} disabled={list.loadingMore} className="mx-auto block rounded-xl border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:border-ink disabled:opacity-50">
              {list.loadingMore ? "Loading..." : "Show later meetings"}
            </button>
          )}
        </div>
      )}
    </PageShell>
  );
}
