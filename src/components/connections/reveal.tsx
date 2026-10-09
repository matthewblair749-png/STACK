"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { Modal } from "./dialogs";
import type { CatalogApp } from "./types";

interface Found {
  label: string;
  value: number;
}

/**
 * The "STACK understands" moment. Every number is read from the real synced data and work state at the time
 * it opens; zero is shown honestly as "nothing yet" rather than padded.
 */
export function RevealDialog({ apps, onClose }: { apps: CatalogApp[]; onClose: () => void }) {
  const [extra, setExtra] = useState<{ openTasks: number; upcomingMeetings: number; importantMessages: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/work/state")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const c = body?.state?.understand?.counts;
        if (!cancelled && c) setExtra({ openTasks: c.openTasks, upcomingMeetings: c.upcomingMeetings, importantMessages: c.importantMessages });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const connected = apps.filter((a) => a.connected);
  // Apps that share one sign-in (Gmail + Calendar + Drive) would otherwise be counted three times.
  const seen = new Set<string>();
  const unique = connected.filter((a) => (a.oauthProviderId && !seen.has(a.oauthProviderId) ? (seen.add(a.oauthProviderId), true) : !a.oauthProviderId));
  const uniqueTotals = unique.reduce((t, a) => ({ messages: t.messages + (a.counts?.messages ?? 0), events: t.events + (a.counts?.events ?? 0), files: t.files + (a.counts?.files ?? 0) }), { messages: 0, events: 0, files: 0 });

  const found: Found[] = [
    { label: "messages and notifications", value: uniqueTotals.messages },
    { label: "calendar events and meetings", value: uniqueTotals.events },
    { label: "files and documents", value: uniqueTotals.files },
    { label: "open tasks", value: extra?.openTasks ?? 0 },
    { label: "important conversations", value: extra?.importantMessages ?? 0 },
  ].filter((f) => f.value > 0);

  const helps = [...new Set(unique.flatMap((a) => a.meta?.unlocks ?? []))].slice(0, 6);

  return (
    <Modal label="Your work is connected" onClose={onClose}>
      <div className="text-center">
        <span className="inline-flex"><LogoIcon size={36} /></span>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Your work is connected</p>
        <p className="mt-1 text-lg font-semibold text-ink">{found.length ? "STACK found:" : "Connected - nothing has synced yet."}</p>
      </div>
      {found.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {found.map((f) => (
            <li key={f.label} className="flex items-baseline gap-3 rounded-xl bg-neutral-50 px-4 py-2.5">
              <span className="text-xl font-semibold text-ink">{f.value}</span>
              <span className="text-sm text-neutral-600">{f.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-center text-sm text-neutral-500">Your apps are linked, but they haven&apos;t returned any content yet. If an app shows &quot;Needs attention&quot;, open it to see why.</p>
      )}
      {helps.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Here&apos;s what I can help you with</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {helps.map((h) => <li key={h} className="text-sm text-ink">- {h}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">Keep connecting</button>
        <Link href="/home" className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Enter STACK <ArrowRight size={14} /></Link>
      </div>
    </Modal>
  );
}
