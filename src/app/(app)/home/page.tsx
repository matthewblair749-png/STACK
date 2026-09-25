"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Plug, RefreshCw, X } from "lucide-react";
import { AskStackBar, DEFAULT_SUGGESTIONS } from "@/components/app/ask-stack-bar";
import { ActionCard, type PendingActionData } from "@/components/app/action-card";
import { StackCore } from "@/components/app/stack-core";
import { TaskModal } from "@/components/app/task-modal";
import { useToast } from "@/components/app/toast";
import { useWorkState } from "@/components/app/work-state-provider";
import {
  ActionButton, isExternal, ProjectIntelCard, relativeTime, SourceLogos, Skeleton, StageHeader, StageSkeleton, whenLabel,
} from "@/components/app/home-parts";
import { IntegrationLogo } from "@/components/brand-icons";
import { useDemo } from "@/lib/demo-context";
import type { PriorityItem, ProjectCard, WorkAction } from "@/lib/work-types";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConnectedApp { id: string; name: string; logoPath?: string | null; connected: boolean; status?: string }
interface SuggestedApp { slug: string; name: string; logoPath?: string | null; oauthProviderId: string | null; status: string; supported: boolean }
interface Me { user: { name: string | null; profession: string | null } | null; profession: { slug: string; name: string } | null }

/** Suggested commands adapt to what the person does. */
function suggestionsFor(profession?: string | null): string[] {
  const p = (profession ?? "").toLowerCase();
  if (/developer|engineer|devops|qa|data|security|it-/.test(p)) return ["What's blocking the release?", "Summarize my open issues", "Catch me up", "What am I waiting on?", "Find the latest design doc", "Prepare my standup"];
  if (/sales|customer|account|recruiter|marketing|seo|social|brand/.test(p)) return ["Prepare me for my next client", "Which leads need attention?", "Catch me up", "What am I waiting on?", "Find the latest proposal", "Draft a follow-up"];
  if (/lawyer|paralegal|legal|compliance|court/.test(p)) return ["What deadlines are coming up?", "Catch me up on my matters", "Prepare my next meeting", "What am I waiting on?", "Find the latest contract", "Draft a response"];
  if (/doctor|nurse|pharmacist|dentist|medical|health|radiology/.test(p)) return ["What needs my attention today?", "Prepare my next meeting", "What am I waiting on?", "Catch me up", "Find the latest protocol", "Draft a response"];
  return DEFAULT_SUGGESTIONS;
}

function StatusPill({ syncing, error, connectedCount, lastSyncAt, onSync }: { syncing: boolean; error: boolean; connectedCount: number; lastSyncAt?: string; onSync: () => void }) {
  const label = syncing ? "Syncing your apps..." : error ? "Connection needs attention" : connectedCount === 0 ? "No apps connected yet" : "STACK is up to date";
  const dot = syncing ? "bg-blue animate-pulse" : error ? "bg-red" : connectedCount === 0 ? "bg-neutral-300" : "bg-green";
  const Wrapper = connectedCount > 0 ? "button" : "span";
  return (
    <Wrapper
      {...(connectedCount > 0 ? { onClick: onSync, "aria-label": `${label}. Sync now.` } : {})}
      className="inline-flex items-center gap-2 self-start rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:border-neutral-300"
    >
      <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
      <span className="font-medium text-ink">{label}</span>
      {lastSyncAt && !syncing && <span className="text-neutral-400">Synced {relativeTime(lastSyncAt)}</span>}
      {connectedCount > 0 && <RefreshCw size={12} className={cn("text-neutral-400", syncing && "animate-spin")} aria-hidden />}
    </Wrapper>
  );
}

export default function HomePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const toast = useToast();
  const { addTask } = useDemo();
  const { state, brief, status, syncing, syncIssues, syncNow, refresh } = useWorkState();
  const [apps, setApps] = useState<ConnectedApp[] | null>(null);
  const [projects, setProjects] = useState<ProjectCard[] | null>(null);
  const [pending, setPending] = useState<PendingActionData[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [suggested, setSuggested] = useState<SuggestedApp[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const approvalsRef = useRef<HTMLDivElement>(null);

  const loadSide = useCallback(async () => {
    const [p, a] = await Promise.all([fetch("/api/projects/overview"), fetch("/api/actions")]);
    if (p.ok) setProjects((await p.json()).projects);
    else setProjects([]);
    if (a.ok) setPending((await a.json()).actions ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [i, u] = await Promise.all([fetch("/api/integrations"), fetch("/api/user")]);
      if (cancelled) return;
      setApps(i.ok ? (await i.json()).integrations : []);
      if (u.ok) {
        const body: Me = await u.json();
        setMe(body);
        if (body.profession?.slug) {
          const r = await fetch(`/api/apps?profession=${encodeURIComponent(body.profession.slug)}`);
          if (r.ok && !cancelled) {
            const list: SuggestedApp[] = (await r.json()).apps ?? [];
            setSuggested(list.filter((x) => x.supported && x.status !== "connected").slice(0, 6));
          }
        }
      }
      await loadSide();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSide]);

  const connected = (apps ?? []).filter((a) => a.connected);
  const noApps = apps !== null && connected.length === 0;
  const connectionError = (apps ?? []).some((a) => a.status === "error");
  const firstName = brief?.greeting ?? "";
  const loading = status === "loading" || !state;

  function run(action: WorkAction) {
    if (action.command) router.push(`/ai?q=${encodeURIComponent(action.command)}`);
    else if (action.intent === "new-task") setModalOpen(true);
    else if (action.intent === "review-approvals") approvalsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    else if (action.href) {
      if (isExternal(action.href)) window.open(action.href, "_blank", "noopener,noreferrer");
      else router.push(action.href);
    }
  }

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function dismissNextStep(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
    fetch(`/api/insights/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Dismissed" }) }).catch(() => {});
  }

  function handleSaveTask(t: Task) {
    addTask(t);
    toast({ title: "Task created", description: t.title, tone: "success" });
    setTimeout(() => refresh(), 1200);
  }

  function priorityActions(p: PriorityItem): WorkAction[] {
    const list = [...p.actions];
    if (p.kind === "message") list.push({ label: "Create task", command: `Create a task from this email: "${p.title}"` });
    return list.slice(0, 4);
  }

  const enter = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: i * 0.05 } });

  return (
    <div className="mx-auto max-w-[1060px] px-4 py-6 sm:px-8 sm:py-8">
      <motion.header {...enter(0)} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[34px]">
            {firstName || <Skeleton className="h-9 w-64" />}
          </h1>
          <p className="mt-1 text-base text-neutral-500">Here&apos;s what matters right now.</p>
        </div>
        <StatusPill syncing={syncing} error={connectionError || status === "error"} connectedCount={connected.length} lastSyncAt={state?.lastSyncAt} onSync={syncNow} />
      </motion.header>

      {brief && (
        <motion.nav {...enter(1)} aria-label="Today at a glance" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[
            { n: brief.counts.priorities, label: brief.counts.priorities === 1 ? "priority" : "priorities", to: "prioritize" },
            { n: brief.counts.meetingsToPrepare, label: brief.counts.meetingsToPrepare === 1 ? "meeting" : "meetings", to: "forward" },
            { n: brief.counts.projectsAtRisk, label: "at risk", to: "forward" },
            { n: brief.counts.peopleWaiting, label: "waiting on you", to: "forward" },
            { n: brief.counts.dueThisWeek, label: "due this week", to: "forward" },
          ].map((c) => (
            <button key={c.label} onClick={() => jump(c.to)} className="flex shrink-0 items-baseline gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm transition-colors hover:border-ink">
              <span className="font-semibold tabular-nums text-ink">{c.n}</span>
              <span className="text-neutral-500">{c.label}</span>
            </button>
          ))}
        </motion.nav>
      )}

      <motion.div {...enter(2)} className="mt-6">
        <AskStackBar suggestions={suggestionsFor(me?.profession?.slug ?? me?.user?.profession)} />
      </motion.div>

      {pending.length > 0 && (
        <div ref={approvalsRef} className="mt-8 rounded-2xl border border-blue/25 bg-blue-soft/40 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue">Waiting for your approval</p>
          {pending.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              onResolved={(s) => {
                if (s === "approved") toast({ title: "Done", description: "STACK completed the action you approved.", tone: "success" });
                setTimeout(() => { setPending((p) => p.filter((x) => x.id !== a.id)); refresh(); loadSide(); }, 1200);
              }}
            />
          ))}
        </div>
      )}

      {noApps && (
        <motion.section {...enter(3)} aria-labelledby="connect-title" className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-6 sm:p-8">
          <h2 id="connect-title" className="text-lg font-semibold text-ink">Connect your first app to bring STACK to life</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-neutral-500">
            Right now STACK only knows the tasks and projects you&apos;ve added here. Connect the tools you work in and it will understand your email, chats, meetings and files, work out what matters, and help you act on it. Nothing is read from an app until you connect it.
          </p>
          {suggested.length > 0 && (
            <>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-neutral-400">Suggested{me?.profession?.name ? ` for ${me.profession.name}` : ""}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {suggested.map((a) => (
                  <li key={a.slug}>
                    <Link href="/integrations" className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-ink hover:border-ink">
                      <IntegrationLogo app={a.oauthProviderId ?? a.slug} name={a.name} size="md" logoPath={a.logoPath} /> {a.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link href="/integrations" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800">
            <Plug size={15} /> Connect apps
          </Link>
        </motion.section>
      )}

      {!noApps && connected.length > 0 && (
        <motion.div {...enter(3)} className="mt-8">
          <StackCore apps={connected} syncing={syncing} lastSyncAt={state?.lastSyncAt} hasContent={!!state?.hasSyncedContent} issues={syncIssues} onSync={syncNow} />
        </motion.div>
      )}

      <div className="mt-12 space-y-14">
        <section id="understand" aria-labelledby="understand-title" className="scroll-mt-6">
          <StageHeader id="understand" n="01" title="UNDERSTAND" subtitle="Everything happening across your work." />
          <div className="mt-5">
            {loading ? (
              <StageSkeleton />
            ) : (
              <>
                <p className="max-w-2xl text-[17px] leading-relaxed text-ink">{state.understand.overview}</p>
                {state.understand.digests.length > 0 ? (
                  <ul className="mt-6 grid gap-x-10 gap-y-7 md:grid-cols-2">
                    {state.understand.digests.map((d) => (
                      <li key={d.projectId}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{d.name}</p>
                        <p className="mt-1 text-sm font-semibold text-ink">
                          {d.items.length} important {d.items.length === 1 ? "thing" : "things"} happened
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {d.items.map((item) => (
                            <li key={item} className="flex gap-2 text-sm text-neutral-600"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neutral-400" aria-hidden />{item}</li>
                          ))}
                        </ul>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <SourceLogos sources={d.sources} />
                          <Link href={d.href} className="inline-flex items-center gap-1 text-xs font-semibold text-blue hover:underline">View full context <ArrowRight size={11} /></Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-neutral-400">
                    {state.hasSyncedContent ? "Nothing important has changed across your projects." : noApps ? "Connect an app and STACK will summarize what's happening across it." : "Nothing synced yet. Use the sync button above to pull in your latest work."}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <section id="prioritize" aria-labelledby="prioritize-title" className="scroll-mt-6">
          <StageHeader id="prioritize" n="02" title="PRIORITIZE" subtitle="What matters most right now." />
          <div className="mt-5">
            {loading ? (
              <StageSkeleton />
            ) : state.priorities.length === 0 ? (
              <p className="text-sm text-neutral-500">Nothing is competing for your attention. When something matters, STACK will list it here and say why.</p>
            ) : (
              <ol className="divide-y divide-neutral-100 border-y border-neutral-100">
                {state.priorities.map((p, i) => (
                  <li key={p.id} className="py-5">
                    <div className="flex gap-4">
                      <span className="w-8 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-neutral-300">{String(i + 1).padStart(2, "0")}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{p.kind === "event" ? "Meeting" : p.kind === "message" ? "Message" : p.kind === "waiting" ? "Waiting on you" : "Task"}</p>
                        <p className="mt-0.5 text-base font-semibold text-ink">{p.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600">{p.why.join(" ")}</p>
                        <p className="mt-1.5 text-sm text-ink"><span className="font-medium text-blue">Next: </span>{p.nextStep}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {priorityActions(p).map((a, idx) => <ActionButton key={a.label} action={a} primary={idx === 0} onRun={run} />)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section id="act" aria-labelledby="act-title" className="scroll-mt-6">
          <StageHeader id="act" n="03" title="ACT" subtitle="Turn priorities into completed work." />
          <div className="mt-5">
            {loading ? (
              <StageSkeleton />
            ) : (
              <>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {state.act.map((a) => (
                    <button key={a.label} onClick={() => run(a)} className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-ink">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{a.label}</span>
                        {a.hint && <span className="block truncate text-xs text-neutral-400">{a.hint}</span>}
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-neutral-400">STACK asks for your approval (Approve, Edit or Cancel) before it sends, schedules, or changes anything.</p>
              </>
            )}
          </div>
        </section>

        <section id="forward" aria-labelledby="forward-title" className="scroll-mt-6">
          <StageHeader id="forward" n="04" title="MOVE FORWARD" subtitle="Know what happens next." />
          <div className="mt-5">
            {loading ? (
              <StageSkeleton />
            ) : (
              <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Up next</h3>
                  {state.moveForward.upNext.length === 0 ? (
                    <p className="mt-2 text-sm text-neutral-400">Nothing scheduled or due soon.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {state.moveForward.upNext.map((u) => (
                        <li key={`${u.kind}${u.id}`} className="flex gap-4">
                          <span className="w-20 shrink-0 text-sm font-semibold tabular-nums text-ink">{whenLabel(u.at)}</span>
                          <span className="flex min-w-0 items-center gap-2 text-sm text-neutral-600">
                            {u.appId && <IntegrationLogo app={u.appId} name={u.appId} size="sm" />}
                            {u.href ? (isExternal(u.href) ? <a href={u.href} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{u.title}</a> : <Link href={u.href} className="truncate hover:underline">{u.title}</Link>) : <span className="truncate">{u.title}</span>}
                            {u.kind !== "meeting" && <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">{u.kind}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {state.moveForward.nextBestAction && (
                    <div className="mt-7 rounded-xl border border-blue/20 bg-blue-soft/50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-blue">Next best action</p>
                      <p className="mt-1 text-sm font-medium text-ink">{state.moveForward.nextBestAction.title}</p>
                      {state.moveForward.nextBestAction.why && <p className="mt-0.5 text-xs text-neutral-500">{state.moveForward.nextBestAction.why}</p>}
                      {state.moveForward.nextBestAction.action && <div className="mt-3"><ActionButton action={state.moveForward.nextBestAction.action} primary onRun={run} /></div>}
                    </div>
                  )}
                </div>

                <div className="space-y-7">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Waiting on you</h3>
                    {state.moveForward.waitingOnMe.length === 0 ? <p className="mt-2 text-sm text-neutral-400">No one is waiting on you.</p> : (
                      <>
                        <p className="mt-1.5 text-sm font-medium text-ink">{state.moveForward.waitingOnMe.length} {state.moveForward.waitingOnMe.length === 1 ? "person is" : "people are"} waiting for a response.</p>
                        <ul className="mt-2 space-y-1.5">
                          {state.moveForward.waitingOnMe.map((w) => <li key={w.id} className="text-sm text-neutral-600"><span className="font-medium text-ink">{w.who ?? "Someone"}</span> - {w.title}</li>)}
                        </ul>
                      </>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Waiting on others</h3>
                    {state.moveForward.waitingOnOthers.length === 0 ? <p className="mt-2 text-sm text-neutral-400">You&apos;re not blocked by anyone.</p> : (
                      <ul className="mt-2 space-y-1.5">
                        {state.moveForward.waitingOnOthers.map((w) => <li key={w.id} className="text-sm text-neutral-600">{w.title} <span className="text-neutral-400">- waiting on {w.who ?? "someone"}</span></li>)}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">At risk</h3>
                    {state.moveForward.atRisk.length === 0 ? <p className="mt-2 text-sm text-neutral-400">Nothing is at risk.</p> : (
                      <ul className="mt-2 space-y-2">
                        {state.moveForward.atRisk.map((r) => (
                          <li key={r.id}>
                            <Link href={`/projects/${r.id}`} className="text-sm font-semibold text-ink hover:underline">{r.name}</Link>
                            <p className="text-xs text-red">{r.reason}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {state.moveForward.nextSteps.filter((n) => !dismissed.has(n.id)).length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">After what you finished</h3>
                      <ul className="mt-2 space-y-2">
                        {state.moveForward.nextSteps.filter((n) => !dismissed.has(n.id)).map((n) => (
                          <li key={n.id} className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-ink">{n.title}</p>
                              {n.body && <p className="text-xs text-neutral-500">{n.body}</p>}
                            </div>
                            <button onClick={() => dismissNextStep(n.id)} aria-label="Dismiss" className="shrink-0 text-neutral-300 hover:text-neutral-500"><X size={14} /></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="mt-8 text-xs text-neutral-400">Then it repeats: as work moves, STACK re-reads what&apos;s happening and updates what matters.</p>
        </section>

        <section aria-labelledby="projects-title" className="scroll-mt-6">
          <div className="flex items-baseline justify-between">
            <h2 id="projects-title" className="text-sm font-semibold tracking-[0.18em] text-ink">PROJECT INTELLIGENCE</h2>
            <Link href="/projects" className="text-xs font-medium text-neutral-400 hover:text-ink">All projects</Link>
          </div>
          <div className="mt-5">
            {projects === null ? (
              <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-neutral-500">No active projects yet. <Link href="/projects" className="font-medium text-blue hover:underline">Create one</Link> and STACK will summarize its progress, blockers and linked conversations.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projects.slice(0, 4).map((p) => <ProjectIntelCard key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </section>
      </div>

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveTask} initial={null} />
    </div>
  );
}
