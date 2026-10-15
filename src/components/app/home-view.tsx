"use client";

/*
 * Home: today, at a glance. Laid out from what works in the best daily-work tools:
 * - one focal point top-left ("Start here"), read first in the F-shaped scan people use on screens;
 * - anything waiting for approval always in the same place, right under it;
 * - the day as a timeline beside the work (Sunsama/Motion), so time and load are visible;
 * - everything else compact and scannable, with details one click away.
 * It only ever shows what the work state says - nothing is invented.
 */
import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock, Flag, Loader2, MessageCircle, Plug, RefreshCw, Sparkles, X, Zap } from "lucide-react";
import { AskStackBar } from "@/components/app/ask-stack-bar";
import { ActionCard, type PendingActionData } from "@/components/app/action-card";
import { ActionButton, isExternal, ProjectIntelCard, relativeTime, Skeleton, SourceLogos, whenLabel } from "@/components/app/home-parts";
import { IntegrationLogo } from "@/components/brand-icons";
import { groupFor } from "@/lib/data-groups";
import type { DailyBrief, PriorityItem, ProjectCard, UpNextItem, WorkAction, WorkState } from "@/lib/work-types";
import { cn } from "@/lib/utils";

export interface ConnectedApp {
  id: string;
  name: string;
  logoPath?: string | null;
  connected: boolean;
  status?: string;
}
export interface SuggestedApp {
  slug: string;
  name: string;
  logoPath?: string | null;
  oauthProviderId: string | null;
  status: string;
  supported: boolean;
  configured?: boolean;
  tokenConnect?: unknown;
}

export interface HomeViewProps {
  state: WorkState | null;
  brief: DailyBrief | null;
  loading: boolean;
  apps: ConnectedApp[] | null;
  connected: ConnectedApp[];
  noApps: boolean;
  syncing: boolean;
  syncIssues: { provider: string; error: string }[];
  hasConnectionError: boolean;
  onSync: () => void;
  projects: ProjectCard[] | null;
  pending: PendingActionData[];
  suggested: SuggestedApp[];
  professionName?: string;
  suggestions: string[];
  dismissed: Set<string>;
  reduceMotion: boolean;
  onRun: (a: WorkAction) => void;
  onJump: (id: string) => void;
  onDismissNextStep: (id: string) => void;
  onActionResolved: (id: string, status: string) => void;
  /** Rendered after the page (e.g. the new-task modal). */
  children?: ReactNode;
}

const card = "rounded-3xl border border-neutral-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_16px_40px_-28px_rgba(0,0,0,0.18)]";

/** Colour by meaning: red = needs you, blue = meetings and information, green = done and go, yellow = waiting. */
type Tone = "red" | "blue" | "green" | "yellow";
const toneIcon: Record<Tone, string> = { red: "bg-red-soft text-red", blue: "bg-blue-soft text-blue", green: "bg-green-soft text-green", yellow: "bg-yellow-soft text-yellow-700" };
const toneText: Record<Tone, string> = { red: "text-red", blue: "text-blue", green: "text-green", yellow: "text-yellow-700" };
const toneDot: Record<Tone, string> = { red: "bg-red", blue: "bg-blue", green: "bg-green", yellow: "bg-yellow" };

function CardTitle({ icon, title, right, tone }: { icon: ReactNode; title: string; right?: ReactNode; tone: Tone }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneIcon[tone])}>{icon}</span>
        {title}
      </h2>
      {right}
    </div>
  );
}

const initials = (name: string) => name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";
/** "Conversation" is only accurate for email/chat - an invoice, order or candidate update from a
 * connected app gets that app's own category (Money, Orders, People & hiring...) instead. */
function kindLabel(k: PriorityItem["kind"], appId?: string) {
  if (k === "event") return "Meeting";
  if (k === "waiting") return "Waiting on you";
  if (k === "task") return "Task";
  const group = appId ? groupFor(appId) : undefined;
  return !group || group.id === "email" || group.id === "chat" ? "Conversation" : group.label;
}

function Empty({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-soft text-green">{icon}</span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-neutral-500">{body}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ the clock (client only, ticks each minute) */

const subscribeMinute = (cb: () => void) => {
  const id = window.setInterval(cb, 30_000);
  return () => window.clearInterval(id);
};
const getMinute = () => Math.floor(Date.now() / 60_000);
const getServerMinute = () => null;

function useNow(): number | null {
  const minute = useSyncExternalStore(subscribeMinute, getMinute, getServerMinute);
  return minute === null ? null : minute * 60_000;
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* ------------------------------------------------------------------ sync status, as a compact pill */

function SyncPill({ connected, syncing, lastSyncAt, issues, hasError, onSync }: { connected: ConnectedApp[]; syncing: boolean; lastSyncAt?: string; issues: { provider: string; error: string }[]; hasError: boolean; onSync: () => void }) {
  const bad = issues.length > 0 || hasError;
  const health = syncing ? "syncing" : bad ? "error" : lastSyncAt ? "live" : "waiting";
  const label = health === "syncing" ? "Syncing your apps..." : health === "error" ? "A connection needs attention" : health === "live" ? `Up to date${lastSyncAt ? ` · ${relativeTime(lastSyncAt)}` : ""}` : "Waiting for the first sync";
  return (
    <div className={cn(card, "flex items-center gap-3 rounded-full py-1.5 pl-2 pr-1.5")} title={health === "error" ? issues[0]?.error : undefined}>
      <ul className="flex items-center -space-x-1.5" aria-label="Connected apps">
        {connected.slice(0, 4).map((a) => (
          <li key={a.id} title={a.name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white ring-1 ring-neutral-100">
            <IntegrationLogo app={a.id} name={a.name} size="sm" logoPath={a.logoPath} />
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-700">
        <span className={cn("h-2 w-2 rounded-full", health === "live" && "bg-green", health === "syncing" && "animate-pulse bg-blue", health === "error" && "bg-red", health === "waiting" && "bg-yellow")} aria-hidden />
        {health === "error" ? <Link href="/integrations" className="hover:underline">{label}</Link> : label}
      </p>
      <button onClick={onSync} disabled={syncing} aria-label="Sync now" className="flex h-7 items-center gap-1.5 rounded-full border border-neutral-200 px-2.5 text-xs font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60">
        <RefreshCw size={12} className={syncing ? "animate-spin" : undefined} />
        <span className="hidden sm:inline">{syncing ? "Syncing" : "Sync"}</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ today, as a timeline */

const HOUR = 38; // px per hour

function DayTimeline({ items }: { items: UpNextItem[] }) {
  const now = useNow();
  const today = now ? new Date(now) : null;
  const todays = today ? items.filter((u) => sameDay(new Date(u.at), today)).sort((a, b) => +new Date(a.at) - +new Date(b.at)) : [];
  const later = today ? items.filter((u) => !sameDay(new Date(u.at), today)) : items;

  const hourOf = (d: Date) => d.getHours() + d.getMinutes() / 60;
  const hours = todays.map((u) => hourOf(new Date(u.at)));
  const nowH = today ? hourOf(today) : null;
  // The rest of today, not the whole day: from just before now, at least six hours, stretched to fit what is on.
  const first = nowH === null ? 8 : Math.max(0, Math.floor(nowH) - 1);
  const start = Math.min(first, ...hours.map((h) => Math.floor(h)));
  const end = Math.min(24, Math.max(start + 6, ...hours.map((h) => Math.ceil(h + 0.5))));

  // Items closer than half an hour share the row side by side.
  const placed: { u: UpNextItem; top: number; col: number }[] = [];
  for (const u of todays) {
    const top = (hourOf(new Date(u.at)) - start) * HOUR;
    const clash = placed.find((p) => Math.abs(p.top - top) < HOUR * 0.75 && p.col === 0);
    placed.push({ u, top, col: clash ? 1 : 0 });
  }

  return (
    <div>
      {today ? (
        <div className="relative mt-4" style={{ height: (end - start) * HOUR }}>
          {Array.from({ length: end - start + 1 }, (_, i) => (
            <div key={i} className="absolute inset-x-0 flex items-center gap-2" style={{ top: i * HOUR - 7 }}>
              <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-neutral-400">
                {new Date(2000, 0, 1, start + i).toLocaleTimeString(undefined, { hour: "numeric" })}
              </span>
              <span className="h-px flex-1 bg-neutral-100" />
            </div>
          ))}
          {placed.map(({ u, top, col }) => {
            const inner = (
              <>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums opacity-80">
                  {u.appId && <IntegrationLogo app={u.appId} name={u.appId} size="sm" />}
                  {whenLabel(u.at)}
                </span>
                <span className="block truncate text-[12.5px] font-semibold">{u.title}</span>
              </>
            );
            const cls = cn(
              "absolute rounded-xl px-2.5 py-1.5 ring-1 transition-colors",
              u.kind === "meeting" ? "bg-blue-soft text-ink ring-blue/20 hover:ring-blue/50" : "bg-yellow-soft text-ink ring-yellow/30 hover:ring-yellow/60",
            );
            const style = { top: top + 2, height: HOUR * 0.9, left: col ? "calc(50% + 26px)" : 52, right: col ? 0 : todays.length > 1 && placed.some((p) => p.col === 1) ? "calc(50% - 22px)" : 0 };
            return u.href ? (
              isExternal(u.href) ? (
                <a key={u.id} href={u.href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{inner}</a>
              ) : (
                <Link key={u.id} href={u.href} className={cls} style={style}>{inner}</Link>
              )
            ) : (
              <div key={u.id} className={cls} style={style}>{inner}</div>
            );
          })}
          {nowH !== null && nowH >= start && nowH <= end && (
            <div className="pointer-events-none absolute inset-x-0 flex items-center" style={{ top: (nowH - start) * HOUR }} aria-label="Now">
              <span className="ml-[44px] h-2.5 w-2.5 rounded-full bg-red ring-2 ring-white" />
              <span className="h-[2px] flex-1 bg-red" />
            </div>
          )}
          {todays.length === 0 && (
            <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 pl-12 text-center text-sm text-neutral-500">Nothing scheduled today.</p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
      )}
      {later.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Coming up</p>
          <ul className="mt-2 space-y-1.5">
            {later.slice(0, 4).map((u) => (
              <li key={`${u.kind}${u.id}`} className="flex items-center gap-2 text-sm">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", u.kind === "meeting" ? "bg-blue" : "bg-yellow")} aria-hidden />
                <span className="w-20 shrink-0 text-xs text-neutral-500">{whenLabel(u.at)}</span>
                <span className="truncate font-medium text-ink">{u.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Home */

export function HomeView(p: HomeViewProps) {
  const { state, brief, loading } = p;
  const now = useNow();
  const motionProps = (i: number) => (p.reduceMotion ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const } });

  const priorityActions = (x: PriorityItem): WorkAction[] => {
    const list = [...x.actions];
    if (x.kind === "message") list.push({ label: "Create task", command: `Create a task from this: "${x.title}"` });
    return list.slice(0, 3);
  };

  // "Start here" answers "what should I do first?": the day's plan, else the best next action, else the top priority.
  const top = state?.priorities[0];
  const hero: { title: string; why?: string; action?: WorkAction } | null =
    brief?.plan ? { title: brief.plan.headline, why: brief.plan.reason, action: brief.plan.action }
    : state?.moveForward.nextBestAction ? { title: state.moveForward.nextBestAction.title, why: state.moveForward.nextBestAction.why, action: state.moveForward.nextBestAction.action }
    : top ? { title: top.title, why: top.why[0], action: priorityActions(top)[0] }
    : null;
  // Nothing needs you: the focal card turns green so "all clear" reads at a glance.
  const clear = !loading && !hero;

  const c = brief?.counts;
  const summary = c
    ? [
        { n: c.priorities, label: c.priorities === 1 ? "needs you" : "need you", to: "needs-you", tone: "red" as Tone },
        { n: c.meetingsToPrepare, label: c.meetingsToPrepare === 1 ? "meeting" : "meetings", to: "today", tone: "blue" as Tone },
        { n: c.projectsAtRisk, label: "at risk", to: "waiting", tone: "red" as Tone },
        { n: c.peopleWaiting, label: "waiting on you", to: "waiting", tone: "yellow" as Tone },
        { n: c.dueThisWeek, label: "due this week", to: "today", tone: "blue" as Tone },
      ].filter((s) => s.n > 0)
    : [];

  const nextSteps = (state?.moveForward.nextSteps ?? []).filter((n) => !p.dismissed.has(n.id));
  const messages = state?.understand.importantMessages.slice(0, 5) ?? [];
  const convoCount = state?.understand.counts.importantMessages ?? 0;
  const dateLine = now ? new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : " ";

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      {/* Header: date, greeting, today in one line, and sync status */}
      <motion.header {...motionProps(0)} className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-500" suppressHydrationWarning>{dateLine}</p>
          <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[36px]">{brief?.greeting || <Skeleton className="h-10 w-72" />}</h1>
          {p.noApps ? (
            <p className="mt-1.5 text-base text-neutral-500">Connect your first app and STACK gets to work.</p>
          ) : summary.length > 0 ? (
            <nav aria-label="Today at a glance" className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-[15px] text-neutral-500">
              {summary.map((s, i) => (
                <span key={s.label} className="inline-flex items-center gap-1">
                  {i > 0 && <span aria-hidden className="px-1 text-neutral-300">·</span>}
                  <button onClick={() => p.onJump(s.to)} className="rounded-md px-1 hover:bg-neutral-50 hover:text-ink">
                    {/* The first figure is the one that matters most today, so it gets the highlighter, in its colour. */}
                    <span className={cn("inline-flex items-center gap-1.5", i === 0 && `highlight hl-${s.tone} text-ink`)}>
                      <span aria-hidden className={cn("h-2 w-2 rounded-full", toneDot[s.tone])} />
                      <span><span className={cn("font-semibold tabular-nums", toneText[s.tone])}>{s.n}</span> {s.label}</span>
                    </span>
                  </button>
                </span>
              ))}
            </nav>
          ) : (
            loading ? (
              <p className="mt-1.5 text-base text-neutral-500">Reading your apps...</p>
            ) : (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-base font-medium text-green"><CheckCircle2 size={17} /> You&apos;re all caught up.</p>
            )
          )}
        </div>
        {p.connected.length > 0 && <SyncPill connected={p.connected} syncing={p.syncing} lastSyncAt={state?.lastSyncAt} issues={p.syncIssues} hasError={p.hasConnectionError} onSync={p.onSync} />}
      </motion.header>

      {/* Nothing connected: a warm, clear first step */}
      {p.noApps && (
        <motion.section {...motionProps(1)} aria-labelledby="connect-title" className={cn(card, "mt-6 overflow-hidden")}>
          <div className="bg-[radial-gradient(120%_140%_at_0%_0%,var(--color-blue-soft)_0%,var(--color-paper)_60%)] p-6 sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white"><Sparkles size={20} /></span>
            <h2 id="connect-title" className="mt-4 text-2xl font-semibold tracking-tight text-ink">Bring STACK to life</h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-neutral-600">Connect the tools you already use. STACK reads your email, chats, meetings and files, works out what matters, and helps you act on it. Nothing is read until you connect an app, and nothing is sent without your approval.</p>
            {p.suggested.length > 0 && (
              <>
                <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-400">Start with{p.professionName ? ` (popular for ${p.professionName})` : ""}</p>
                <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {p.suggested.map((a) => (
                    <li key={a.slug}>
                      <Link href={`/integrations?connect=${a.slug}`} className="group flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-md">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50"><IntegrationLogo app={a.oauthProviderId ?? a.slug} name={a.name} size="md" logoPath={a.logoPath} /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{a.name}</span><span className="block text-xs text-neutral-500">One-tap connect</span></span>
                        <ArrowRight size={15} className="text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Link href="/integrations" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"><Plug size={15} /> Browse all apps</Link>
          </div>
        </motion.section>
      )}

      {!p.noApps && (
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ---------------- the work ---------------- */}
          <div className="min-w-0 space-y-6">
            {/* Start here: the one thing to do next */}
            <motion.section
              {...motionProps(1)}
              aria-label={clear ? "All clear" : "Start here"}
              className={cn(
                "relative overflow-hidden rounded-3xl p-6 text-[#ffffff] ring-1 ring-[rgba(255,255,255,0.06)] transition-colors duration-500 sm:p-8",
                clear ? "bg-[linear-gradient(135deg,#0f3d26,#14532d)] shadow-[0_24px_60px_-28px_rgba(20,83,45,0.75)]" : "bg-[#121110] shadow-[0_24px_60px_-28px_rgba(18,17,16,0.7)]",
              )}
            >
              <div aria-hidden className={cn("pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full", clear ? "bg-[radial-gradient(closest-side,rgba(74,222,128,0.35),transparent)]" : "bg-[radial-gradient(closest-side,rgba(229,72,59,0.3),transparent)]")} />
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {clear ? (
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86efac]"><CheckCircle2 size={13} /> All clear</p>
                  ) : (
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff8a7d]"><Zap size={13} /> Start here</p>
                  )}
                  {state && state.priorities.length > 1 && (
                    <button onClick={() => p.onJump("needs-you")} className="text-xs font-medium text-[rgba(255,255,255,0.6)] hover:text-[#ffffff]">
                      1 of {state.priorities.length} priorities
                    </button>
                  )}
                </div>
                {loading ? (
                  <div className="mt-4 space-y-3"><Skeleton className="h-8 w-3/4 bg-[rgba(255,255,255,0.1)]" /><Skeleton className="h-4 w-1/2 bg-[rgba(255,255,255,0.1)]" /></div>
                ) : hero ? (
                  <>
                    <p className="mt-3 max-w-2xl text-2xl font-semibold leading-snug tracking-tight sm:text-[28px]">{hero.title}</p>
                    {hero.why && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[rgba(255,255,255,0.7)]">{hero.why}</p>}
                    {hero.action && (
                      <button onClick={() => p.onRun(hero.action!)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-green px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(21,128,61,0.8)] transition-transform hover:-translate-y-0.5">
                        {hero.action.label} <ArrowRight size={15} />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-3 flex items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-[28px]"><CheckCircle2 className="text-[#86efac]" size={26} /> You&apos;re all clear.</p>
                    <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[rgba(255,255,255,0.78)]">Nothing is competing for your attention right now. When something matters, it shows up here first with the reason.</p>
                  </>
                )}
              </div>
            </motion.section>

            {/* Waiting for approval: always right here when there is any */}
            {p.pending.length > 0 && (
              <section id="approvals" aria-label="Waiting for your approval" className="rounded-3xl border border-green/25 bg-green-soft/40 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-green">Waiting for your approval</p>
                {p.pending.map((a) => <ActionCard key={a.id} action={a} onResolved={(s) => p.onActionResolved(a.id, s)} />)}
              </section>
            )}

            <motion.div {...motionProps(2)}>
              <AskStackBar suggestions={p.suggestions} />
            </motion.div>

            {/* Priorities, ranked, each with its reason */}
            <motion.section {...motionProps(3)} id="needs-you" aria-labelledby="needs-title" className={cn(card, "scroll-mt-6 p-5 sm:p-6")}>
              <CardTitle tone={state && !loading && state.priorities.length === 0 ? "green" : "red"} icon={<Flag size={15} />} title="Needs you" right={state && state.priorities.length > 0 ? <span className="text-xs text-neutral-400">Ranked by what matters most</span> : undefined} />
              <span id="needs-title" className="sr-only">Needs you</span>
              {loading || !state ? (
                <div className="mt-5 space-y-4"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
              ) : state.priorities.length === 0 ? (
                <Empty icon={<CheckCircle2 size={22} />} title="Nothing is urgent" body="No overdue tasks, no meetings to prepare, and no one waiting on you. Enjoy the calm." />
              ) : (
                <ol className="mt-3 divide-y divide-neutral-100">
                  {state.priorities.map((x, i) => (
                    <li key={x.id} className="group flex gap-4 py-4 first:pt-2 last:pb-1">
                      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", i === 0 ? "bg-red text-white" : "bg-neutral-100 text-neutral-600")}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                          {x.appId && <IntegrationLogo app={x.appId} name={x.appId} size="sm" />}
                          <span className="font-semibold uppercase tracking-wider">{kindLabel(x.kind, x.appId)}</span>
                          {x.due && <span>· {whenLabel(x.due)}</span>}
                        </div>
                        <p className="mt-1 text-[15px] font-semibold leading-snug text-ink">{i === 0 ? <span className="highlight hl-red">{x.title}</span> : x.title}</p>
                        {x.why.length > 0 && <p className="mt-1 text-sm text-neutral-500">{x.why.slice(0, 3).join(" · ")}</p>}
                        <p className="mt-1.5 text-sm text-ink"><span className="font-medium text-blue">Next: </span>{x.nextStep}</p>
                        <div className="mt-3 flex flex-wrap gap-2">{priorityActions(x).map((a, idx) => <ActionButton key={a.label} action={a} primary={idx === 0} onRun={p.onRun} />)}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </motion.section>

            {/* What people are saying */}
            <motion.section {...motionProps(4)} id="understand" aria-labelledby="convo-title" className={cn(card, "scroll-mt-6 p-5 sm:p-6")}>
              <CardTitle tone="blue" icon={<MessageCircle size={15} />} title={convoCount > 0 ? `Needs a look (${convoCount})` : "Needs a look"} right={<Link href="/inbox" className="text-xs font-medium text-neutral-500 hover:text-ink">Open Inbox</Link>} />
              <span id="convo-title" className="sr-only">Needs a look</span>
              {loading || !state ? (
                <div className="mt-5 space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
              ) : messages.length === 0 ? (
                <Empty icon={<MessageCircle size={22} />} title="Nothing needs a look" body={state.hasSyncedContent ? "No important messages or updates right now." : "Nothing synced yet. Press Sync to pull in your connected apps' latest."} />
              ) : (
                <ul className="mt-3 divide-y divide-neutral-100">
                  {messages.map((m) => {
                    const inner = (
                      <>
                        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                          {initials(m.from)}
                          <span className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white ring-1 ring-neutral-100">
                            <IntegrationLogo app={m.appId} name={m.appId} size="sm" />
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3"><span className="truncate text-sm font-semibold text-ink">{m.from}</span><span className="shrink-0 text-xs text-neutral-400">{relativeTime(m.receivedAt)}</span></span>
                          <span className="block truncate text-sm text-neutral-600">{m.subject || "(no subject)"}</span>
                        </span>
                      </>
                    );
                    const cls = "flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-neutral-50";
                    return (
                      <li key={m.id}>
                        {m.href ? (isExternal(m.href) ? <a href={m.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a> : <Link href={m.href} className={cls}>{inner}</Link>) : <div className={cls}>{inner}</div>}
                      </li>
                    );
                  })}
                </ul>
              )}
              {state && state.understand.digests.length > 0 && (
                <div className="mt-5 border-t border-neutral-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Across your projects</p>
                  <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                    {state.understand.digests.map((d) => (
                      <li key={d.projectId} className="rounded-2xl bg-neutral-50 p-3.5">
                        <p className="text-sm font-semibold text-ink">{d.name}</p>
                        <ul className="mt-1.5 space-y-1">{d.items.slice(0, 3).map((it) => <li key={it} className="text-xs leading-relaxed text-neutral-600">- {it}</li>)}</ul>
                        <div className="mt-2.5 flex items-center justify-between"><SourceLogos sources={d.sources} /><Link href={d.href} className="text-xs font-semibold text-blue hover:underline">Open</Link></div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.section>
          </div>

          {/* ---------------- the day ---------------- */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <motion.section {...motionProps(2)} id="today" aria-label="Today" className={cn(card, "scroll-mt-6 p-5")}>
              <CardTitle tone="blue" icon={<CalendarClock size={15} />} title="Today" right={<Link href="/calendar" className="text-xs font-medium text-neutral-500 hover:text-ink">Calendar</Link>} />
              {loading || !state ? <div className="mt-4 space-y-3"><Skeleton className="h-40" /></div> : <DayTimeline items={state.moveForward.upNext} />}
            </motion.section>

            <motion.section {...motionProps(3)} id="waiting" aria-label="Waiting and at risk" className={cn(card, "scroll-mt-6 p-5")}>
              <CardTitle tone="yellow" icon={<Clock size={15} />} title="Waiting and at risk" />
              {loading || !state ? (
                <div className="mt-4"><Skeleton className="h-20" /></div>
              ) : (
                <div className="mt-3 space-y-4 text-sm">
                  {state.moveForward.atRisk.length > 0 && (
                    <ul className="space-y-2">
                      {state.moveForward.atRisk.map((r) => (
                        <li key={r.id} className="flex items-start gap-2.5 rounded-2xl bg-red-soft/60 p-3">
                          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red" />
                          <span className="min-w-0"><Link href={`/projects/${r.id}`} className="font-semibold text-ink hover:underline">{r.name}</Link><span className="block text-xs text-red">{r.reason}</span></span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Waiting on you</p>
                    {state.moveForward.waitingOnMe.length === 0 ? <p className="mt-1 text-neutral-500">No one is waiting on you.</p> : (
                      <ul className="mt-1.5 space-y-1.5">{state.moveForward.waitingOnMe.slice(0, 4).map((w) => <li key={w.id} className="text-neutral-600"><span className="font-medium text-ink">{w.who ?? "Someone"}</span> - {w.title}</li>)}</ul>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Waiting on others</p>
                    {state.moveForward.waitingOnOthers.length === 0 ? <p className="mt-1 text-neutral-500">You&apos;re not blocked by anyone.</p> : (
                      <ul className="mt-1.5 space-y-1.5">{state.moveForward.waitingOnOthers.slice(0, 4).map((w) => <li key={w.id} className="text-neutral-600">{w.title} <span className="text-neutral-400">- {w.who ?? "someone"}</span></li>)}</ul>
                    )}
                  </div>
                  {state.moveForward.atRisk.length === 0 && <p className="text-neutral-500">Nothing is at risk.</p>}
                </div>
              )}
            </motion.section>

            {state && state.act.length > 0 && (
              <motion.section {...motionProps(4)} id="act" aria-label="Quick actions" className={cn(card, "scroll-mt-6 p-5")}>
                <CardTitle tone="green" icon={<Zap size={15} />} title="Quick actions" />
                <div className="mt-3 grid gap-2">
                  {state.act.map((a) => (
                    <button key={a.label} onClick={() => p.onRun(a)} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-left transition-colors hover:border-ink">
                      <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{a.label}</span>{a.hint && <span className="block truncate text-xs text-neutral-400">{a.hint}</span>}</span>
                      <ArrowRight size={14} className="shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">STACK asks for your approval before it sends, schedules or changes anything.</p>
              </motion.section>
            )}

            {nextSteps.length > 0 && (
              <section className={cn(card, "p-5")} aria-label="Suggested follow-ups">
                <CardTitle tone="green" icon={<Sparkles size={15} />} title="After what you finished" />
                <ul className="mt-3 space-y-3">
                  {nextSteps.map((n) => (
                    <li key={n.id} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{n.title}</p>{n.body && <p className="text-xs text-neutral-500">{n.body}</p>}</div>
                      <button onClick={() => p.onDismissNextStep(n.id)} aria-label="Dismiss" className="shrink-0 text-neutral-300 hover:text-neutral-500"><X size={14} /></button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      )}

      {/* Projects */}
      {!p.noApps && (
        <section aria-labelledby="projects-title" className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 id="projects-title" className="text-sm font-semibold text-ink">Your projects</h2>
            <Link href="/projects" className="text-xs font-medium text-neutral-500 hover:text-ink">All projects</Link>
          </div>
          <div className="mt-4">
            {p.projects === null ? (
              <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
            ) : p.projects.length === 0 ? (
              <div className={cn(card, "flex items-center justify-between gap-4 p-5")}>
                <p className="text-sm text-neutral-600">No active projects yet. Create one and STACK will summarize its progress, blockers and linked conversations.</p>
                <Link href="/projects" className="shrink-0 rounded-xl bg-ink px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800">Create project</Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">{p.projects.slice(0, 4).map((x) => <ProjectIntelCard key={x.id} p={x} />)}</div>
            )}
          </div>
        </section>
      )}

      {loading && !p.noApps && <p className="sr-only" role="status"><Loader2 size={1} /> Loading your work</p>}
      {p.children}
    </div>
  );
}
