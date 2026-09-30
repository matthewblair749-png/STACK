"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarCheck, CalendarClock, CheckCircle2, Clock, Flag, Loader2, MessageCircle, Plug, RefreshCw, Sparkles, X, Zap } from "lucide-react";
import { AskStackBar } from "@/components/app/ask-stack-bar";
import { ActionCard, type PendingActionData } from "@/components/app/action-card";
import { ActionButton, isExternal, ProjectIntelCard, relativeTime, Skeleton, SourceLogos, whenLabel } from "@/components/app/home-parts";
import { IntegrationLogo } from "@/components/brand-icons";
import { groupFor } from "@/lib/data-groups";
import type { DailyBrief, PriorityItem, ProjectCard, WorkAction, WorkState } from "@/lib/work-types";
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

function CardTitle({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-50 text-neutral-600">{icon}</span>
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

/** How the connected apps are really doing - from the last real sync, never assumed. */
function ConnectedStrip({ connected, syncing, lastSyncAt, issues, hasError, onSync }: { connected: ConnectedApp[]; syncing: boolean; lastSyncAt?: string; issues: { provider: string; error: string }[]; hasError: boolean; onSync: () => void }) {
  const bad = issues.length > 0 || hasError;
  const health = syncing ? "syncing" : bad ? "error" : lastSyncAt ? "live" : "waiting";
  const names = connected.slice(0, 3).map((a) => a.name.split(" (")[0]).join(", ") + (connected.length > 3 ? ` +${connected.length - 3}` : "");
  return (
    <div className={cn(card, "flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-5")}>
      <ul className="flex items-center -space-x-2" aria-label="Connected apps">
        {connected.slice(0, 6).map((a) => (
          <li key={a.id} title={a.name} className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm ring-1 ring-neutral-100">
            <IntegrationLogo app={a.id} name={a.name} size="sm" logoPath={a.logoPath} />
          </li>
        ))}
      </ul>
      <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className={cn("h-2 w-2 rounded-full", health === "live" && "bg-green", health === "syncing" && "animate-pulse bg-blue", health === "error" && "bg-red", health === "waiting" && "bg-yellow")} aria-hidden />
          {health === "syncing" ? "Syncing your apps..." : health === "error" ? "A connection needs attention" : health === "live" ? "Everything is up to date" : "Waiting for the first sync"}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {health === "error" ? (issues[0]?.error ?? "Open Integrations to see what's wrong.").slice(0, 160) : `${names}${lastSyncAt && !syncing ? ` - synced ${relativeTime(lastSyncAt)}` : ""}`}
        </p>
      </div>
      <button onClick={onSync} disabled={syncing} className="order-2 ml-auto inline-flex items-center gap-1.5 rounded-full sm:order-3 sm:ml-0 border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60">
        <RefreshCw size={12} className={syncing ? "animate-spin" : undefined} /> {syncing ? "Syncing" : "Sync now"}
      </button>
    </div>
  );
}

export function HomeView(p: HomeViewProps) {
  const { state, brief, loading } = p;
  const motionProps = (i: number) => (p.reduceMotion ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const } });

  const priorityActions = (x: PriorityItem): WorkAction[] => {
    const list = [...x.actions];
    if (x.kind === "message") list.push({ label: "Create task", command: `Create a task from this: "${x.title}"` });
    return list.slice(0, 3);
  };

  // The hero answers "what should I do first?": the day's plan, else the best next action, else the top priority.
  const top = state?.priorities[0];
  const hero: { title: string; why?: string; action?: WorkAction } | null =
    brief?.plan ? { title: brief.plan.headline, why: brief.plan.reason, action: brief.plan.action }
    : state?.moveForward.nextBestAction ? { title: state.moveForward.nextBestAction.title, why: state.moveForward.nextBestAction.why, action: state.moveForward.nextBestAction.action }
    : top ? { title: top.title, why: top.why[0], action: priorityActions(top)[0] }
    : null;

  const c = brief?.counts;
  const sub = p.noApps
    ? "Connect your first app and STACK gets to work."
    : c
    ? [c.priorities ? `${c.priorities} ${c.priorities === 1 ? "thing needs" : "things need"} you` : "", c.meetingsToPrepare ? `${c.meetingsToPrepare} ${c.meetingsToPrepare === 1 ? "meeting" : "meetings"} to prepare` : "", c.projectsAtRisk ? `${c.projectsAtRisk} at risk` : ""].filter(Boolean).join("  -  ") || "You're all caught up."
    : "Here's what matters right now.";

  const tiles = c
    ? [
        { n: c.priorities, label: "Need you", icon: <Flag size={16} />, to: "needs-you", tone: c.priorities ? "text-blue bg-blue-soft" : "text-neutral-500 bg-neutral-50" },
        { n: c.meetingsToPrepare, label: c.meetingsToPrepare === 1 ? "Meeting" : "Meetings", icon: <CalendarClock size={16} />, to: "up-next", tone: "text-neutral-700 bg-neutral-50" },
        { n: c.projectsAtRisk, label: "At risk", icon: <AlertTriangle size={16} />, to: "waiting", tone: c.projectsAtRisk ? "text-red bg-red-soft" : "text-neutral-500 bg-neutral-50" },
        { n: c.peopleWaiting, label: "Waiting on you", icon: <Clock size={16} />, to: "waiting", tone: c.peopleWaiting ? "text-yellow-700 bg-yellow-soft" : "text-neutral-500 bg-neutral-50" },
        { n: c.dueThisWeek, label: "Due this week", icon: <CalendarCheck size={16} />, to: "up-next", tone: "text-neutral-700 bg-neutral-50" },
      ]
    : [];

  const nextSteps = (state?.moveForward.nextSteps ?? []).filter((n) => !p.dismissed.has(n.id));
  const messages = state?.understand.importantMessages.slice(0, 5) ?? [];
  const convoCount = state?.understand.counts.importantMessages ?? 0;

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8">
      {/* Greeting */}
      <motion.header {...motionProps(0)}>
        <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[38px]">{brief?.greeting || <Skeleton className="h-10 w-72" />}</h1>
        <p className="mt-1.5 text-base text-neutral-500">{sub}</p>
      </motion.header>

      {p.connected.length > 0 && (
        <motion.div {...motionProps(1)} className="mt-6">
          <ConnectedStrip connected={p.connected} syncing={p.syncing} lastSyncAt={state?.lastSyncAt} issues={p.syncIssues} hasError={p.hasConnectionError} onSync={p.onSync} />
        </motion.div>
      )}

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

      {/* Hero: the one thing to do next */}
      {!p.noApps && (
        <motion.section {...motionProps(2)} aria-label="Your next move" className="relative mt-6 overflow-hidden rounded-3xl bg-[#08080c] p-6 text-[#ffffff] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.6)] ring-1 ring-[rgba(255,255,255,0.06)] sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(162,158,240,0.55),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(255,196,46,0.18),transparent)]" />
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,255,255,0.6)]"><Zap size={13} /> Your next move</p>
            {loading ? (
              <div className="mt-4 space-y-3"><Skeleton className="h-8 w-3/4 bg-[rgba(255,255,255,0.1)]" /><Skeleton className="h-4 w-1/2 bg-[rgba(255,255,255,0.1)]" /></div>
            ) : hero ? (
              <>
                <p className="mt-3 max-w-2xl text-2xl font-semibold leading-snug tracking-tight sm:text-[28px]">{hero.title}</p>
                {hero.why && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[rgba(255,255,255,0.7)]">{hero.why}</p>}
                {hero.action && (
                  <button onClick={() => p.onRun(hero.action!)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ffffff] px-4 py-2.5 text-sm font-semibold text-[#000000] transition-transform hover:-translate-y-0.5">
                    {hero.action.label} <ArrowRight size={15} />
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="mt-3 flex items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-[28px]"><CheckCircle2 className="text-green" size={26} /> You&apos;re all clear.</p>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[rgba(255,255,255,0.7)]">Nothing is competing for your attention right now. When something matters, it shows up here first with the reason.</p>
              </>
            )}
          </div>
        </motion.section>
      )}

      {/* At a glance */}
      {tiles.length > 0 && !p.noApps && (
        <motion.nav {...motionProps(3)} aria-label="Today at a glance" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((t) => (
            <button key={t.label} onClick={() => p.onJump(t.to)} className={cn(card, "group flex items-center gap-3 rounded-2xl p-3.5 text-left transition-all last:col-span-2 hover:-translate-y-0.5 hover:border-neutral-300 sm:last:col-span-1")}>
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", t.tone)}>{t.icon}</span>
              <span><span className="block text-xl font-semibold leading-none tabular-nums text-ink">{t.n}</span><span className="mt-1 block text-[11px] font-medium text-neutral-500">{t.label}</span></span>
            </button>
          ))}
        </motion.nav>
      )}

      <motion.div {...motionProps(4)} className="mt-6">
        <AskStackBar suggestions={p.suggestions} />
      </motion.div>

      {/* Anything waiting for approval */}
      {p.pending.length > 0 && (
        <div id="approvals" className="mt-8 rounded-3xl border border-blue/25 bg-blue-soft/40 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue">Waiting for your approval</p>
          {p.pending.map((a) => <ActionCard key={a.id} action={a} onResolved={(s) => p.onActionResolved(a.id, s)} />)}
        </div>
      )}

      {!p.noApps && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left: what needs you, and what people are saying */}
          <div className="space-y-6">
            <motion.section {...motionProps(5)} id="needs-you" aria-labelledby="needs-title" className={cn(card, "scroll-mt-6 p-5 sm:p-6")}>
              <CardTitle icon={<Flag size={15} />} title="Needs you" right={state && state.priorities.length > 0 ? <span className="text-xs text-neutral-400">Ranked by what matters most</span> : undefined} />
              <span id="needs-title" className="sr-only">Needs you</span>
              {loading || !state ? (
                <div className="mt-5 space-y-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
              ) : state.priorities.length === 0 ? (
                <Empty icon={<CheckCircle2 size={22} />} title="Nothing is urgent" body="No overdue tasks, no meetings to prepare, and no one waiting on you. Enjoy the calm." />
              ) : (
                <ol className="mt-4 space-y-3">
                  {state.priorities.map((x, i) => (
                    <li key={x.id} className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4 transition-colors hover:border-neutral-200 hover:bg-white">
                      <div className="flex items-start gap-3.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {x.appId && <IntegrationLogo app={x.appId} name={x.appId} size="sm" />}
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 ring-1 ring-neutral-200">{kindLabel(x.kind, x.appId)}</span>
                            {x.due && <span className="text-xs text-neutral-400">{whenLabel(x.due)}</span>}
                          </div>
                          <p className="mt-1.5 text-[15px] font-semibold leading-snug text-ink">{x.title}</p>
                          {x.why.length > 0 && (
                            <ul className="mt-2 flex flex-wrap gap-1.5">
                              {x.why.slice(0, 3).map((w) => <li key={w} className="rounded-full bg-white px-2.5 py-1 text-xs text-neutral-600 ring-1 ring-neutral-200">{w}</li>)}
                            </ul>
                          )}
                          <p className="mt-2.5 text-sm text-ink"><span className="font-medium text-blue">Next: </span>{x.nextStep}</p>
                          <div className="mt-3 flex flex-wrap gap-2">{priorityActions(x).map((a, idx) => <ActionButton key={a.label} action={a} primary={idx === 0} onRun={p.onRun} />)}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </motion.section>

            <motion.section {...motionProps(6)} id="understand" aria-labelledby="convo-title" className={cn(card, "scroll-mt-6 p-5 sm:p-6")}>
              <CardTitle icon={<MessageCircle size={15} />} title={convoCount > 0 ? `Needs a look (${convoCount})` : "Needs a look"} right={<Link href="/inbox" className="text-xs font-medium text-neutral-500 hover:text-ink">View all</Link>} />
              <span id="convo-title" className="sr-only">Needs a look</span>
              {loading || !state ? (
                <div className="mt-5 space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
              ) : messages.length === 0 ? (
                <Empty icon={<MessageCircle size={22} />} title="Nothing needs a look" body={state.hasSyncedContent ? "No important messages or updates right now." : "Nothing synced yet. Press Sync now to pull in your connected apps' latest."} />
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

          {/* Right rail: what's coming, who's waiting, quick actions */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <motion.section {...motionProps(5)} id="up-next" aria-label="Up next" className={cn(card, "scroll-mt-6 p-5")}>
              <CardTitle icon={<CalendarClock size={15} />} title="Up next" />
              {loading || !state ? (
                <div className="mt-4 space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
              ) : state.moveForward.upNext.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-500">Nothing scheduled or due soon.</p>
              ) : (
                <ul className="relative mt-4 space-y-4 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-neutral-200">
                  {state.moveForward.upNext.slice(0, 6).map((u) => (
                    <li key={`${u.kind}${u.id}`} className="relative pl-6">
                      <span className={cn("absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-white ring-1", u.kind === "meeting" ? "bg-blue ring-blue/40" : "bg-neutral-400 ring-neutral-300")} aria-hidden />
                      <p className="text-xs font-semibold tabular-nums text-neutral-500">{whenLabel(u.at)}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-sm text-ink">
                        {u.appId && <IntegrationLogo app={u.appId} name={u.appId} size="sm" />}
                        {u.href ? (isExternal(u.href) ? <a href={u.href} target="_blank" rel="noopener noreferrer" className="truncate font-medium hover:underline">{u.title}</a> : <Link href={u.href} className="truncate font-medium hover:underline">{u.title}</Link>) : <span className="truncate font-medium">{u.title}</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>

            <motion.section {...motionProps(6)} id="waiting" aria-label="Waiting and at risk" className={cn(card, "scroll-mt-6 p-5")}>
              <CardTitle icon={<Clock size={15} />} title="Waiting and at risk" />
              {loading || !state ? (
                <div className="mt-4"><Skeleton className="h-20" /></div>
              ) : (
                <div className="mt-3 space-y-4 text-sm">
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
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">At risk</p>
                    {state.moveForward.atRisk.length === 0 ? <p className="mt-1 text-neutral-500">Nothing is at risk.</p> : (
                      <ul className="mt-1.5 space-y-2">{state.moveForward.atRisk.map((r) => <li key={r.id}><Link href={`/projects/${r.id}`} className="font-semibold text-ink hover:underline">{r.name}</Link><p className="text-xs text-red">{r.reason}</p></li>)}</ul>
                    )}
                  </div>
                </div>
              )}
            </motion.section>

            {state && state.act.length > 0 && (
              <motion.section {...motionProps(7)} id="act" aria-label="Quick actions" className={cn(card, "scroll-mt-6 p-5")}>
                <CardTitle icon={<Zap size={15} />} title="Quick actions" />
                <div className="mt-3 space-y-2">
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
                <CardTitle icon={<Sparkles size={15} />} title="After what you finished" />
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
            <h2 id="projects-title" className="text-sm font-semibold text-ink">Project intelligence</h2>
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
