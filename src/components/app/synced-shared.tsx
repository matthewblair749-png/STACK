"use client";

import Link from "next/link";
import { Plug, Search } from "lucide-react";
import { Skeleton } from "./home-parts";
import { SyncNowButton } from "./sync-now-button";

export function PageShell({ title, subtitle, children, onSynced }: { title: string; subtitle: string; children: React.ReactNode; onSynced?: () => void }) {
  return (
    <div className="mx-auto flex h-full min-h-0 max-w-4xl flex-col px-4 py-6 sm:px-8">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <SyncNowButton onSynced={onSynced} />
      </div>
      {children}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="mt-5 flex h-10 shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm focus-within:border-neutral-400">
      <Search size={15} className="text-neutral-400" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-400" />
    </label>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mt-4 space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  );
}

/** Honest empty state: says exactly why there's nothing here and how to fix it. */
export function EmptySynced({ what, filtered }: { what: string; filtered?: boolean }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500"><Plug size={18} /></span>
      {filtered ? (
        <p className="mt-3 text-sm text-neutral-500">No {what} match that search.</p>
      ) : (
        <>
          <p className="mt-3 text-sm font-medium text-ink">No {what} yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">STACK only shows {what} from apps you&apos;ve connected. Connect an app in Connected Apps, then sync to bring them in.</p>
          <Link href="/integrations" className="mt-4 inline-flex rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">Connect apps</Link>
        </>
      )}
    </div>
  );
}

export function ErrorNote({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="mt-6 rounded-xl bg-red-soft px-4 py-3 text-sm text-red">
      Couldn&apos;t load this. <button onClick={onRetry} className="font-semibold underline">Try again</button>
    </p>
  );
}
