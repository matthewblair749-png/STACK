"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import type { ProjectCard, WorkAction } from "@/lib/work-types";
import { cn } from "@/lib/utils";

export const isExternal = (href: string) => /^https?:|^slack:/.test(href);

export function whenLabel(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(now)) / 86_400_000);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (days === 0) return time;
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function relativeTime(iso?: string) {
  if (!iso) return undefined;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} hr ago` : `${Math.round(h / 24)} d ago`;
}

export function StageHeader({ id, n, title, subtitle }: { id: string; n: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs font-semibold tabular-nums tracking-widest text-neutral-300" aria-hidden>{n}</span>
      <h2 id={`${id}-title`} className="text-sm font-semibold tracking-[0.18em] text-ink">{title}</h2>
      <p className="hidden text-sm text-neutral-400 sm:block">{subtitle}</p>
    </div>
  );
}

export function ActionButton({ action, primary, onRun }: { action: WorkAction; primary?: boolean; onRun: (a: WorkAction) => void }) {
  return (
    <button
      onClick={() => onRun(action)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
        primary ? "bg-ink text-white hover:bg-neutral-800" : "border border-neutral-200 bg-white text-ink hover:border-ink",
      )}
    >
      {action.label}
      {action.href && isExternal(action.href) ? <ExternalLink size={11} /> : <ArrowRight size={11} />}
    </button>
  );
}

export function SourceLogos({ sources }: { sources: { appId: string; label: string }[] }) {
  if (sources.length === 0) return null;
  return (
    <ul className="flex items-center gap-1.5" aria-label="Sources">
      {sources.map((s) => (
        <li key={s.appId} title={s.label} className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-100 bg-white">
          <IntegrationLogo app={s.appId} name={s.label} size="sm" />
        </li>
      ))}
    </ul>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-neutral-100", className)} />;
}

export function StageSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

const HEALTH = {
  healthy: { dot: "bg-green", label: "Healthy" },
  watch: { dot: "bg-yellow", label: "Needs a look" },
  at_risk: { dot: "bg-red", label: "At risk" },
} as const;

export function ProjectIntelCard({ p }: { p: ProjectCard }) {
  const h = HEALTH[p.health];
  return (
    <article className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-[0_12px_30px_-16px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/projects/${p.id}`} className="min-w-0 text-base font-semibold text-ink hover:underline">
          <span className="block truncate">{p.name}</span>
        </Link>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500"><span className={cn("h-2 w-2 rounded-full", h.dot)} /> {h.label}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-600">{p.summary}</p>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
          <div className="h-full rounded-full bg-blue transition-[width] duration-700" style={{ width: `${p.progress}%` }} />
        </div>
        <span className="text-xs font-medium tabular-nums text-neutral-500">{p.progress}%</span>
      </div>

      <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[
          ["Tasks", p.counts.tasks],
          ["Messages", p.counts.messages],
          ["Files", p.counts.files],
          ["Meetings", p.counts.meetings],
        ].map(([label, n]) => (
          <div key={label as string}>
            <dd className="text-sm font-semibold tabular-nums text-ink">{n}</dd>
            <dt className="text-[11px] text-neutral-400">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
        {p.deadline && <p>Deadline <span className="font-medium text-ink">{whenLabel(p.deadline)}</span></p>}
        <p>
          {p.people.length} {p.people.length === 1 ? "person" : "people"}
          {p.blockers > 0 && <span className="ml-2 font-medium text-red">{p.blockers} {p.blockers === 1 ? "blocker" : "blockers"}{p.blockerReason ? `: ${p.blockerReason}` : ""}</span>}
        </p>
        {p.nextAction && <p className="text-ink"><span className="font-medium text-blue">Next: </span>{p.nextAction}</p>}
      </div>
    </article>
  );
}

export function Spinner() {
  return <Loader2 size={13} className="animate-spin" aria-hidden />;
}
