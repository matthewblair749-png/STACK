"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { ActionCard, type PendingActionData } from "@/components/app/action-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProjectStatus = "OnTrack" | "AtRisk" | "Behind" | "Completed";
interface Intel {
  project: { id: string; name: string; description: string; status: ProjectStatus; deadline?: string };
  summary: { text: string; source: "ai" | "computed"; updatedAt?: string };
  progress: { completed: number; total: number };
  tasks: { id: string; title: string; status: string; priority: string; dueDate?: string; assignee?: string; blockedReason?: string | null; waitingOn?: string }[];
  blockers: { taskId: string; title: string; reason?: string }[];
  waiting: { taskId: string; title: string; waitingOn?: string; owner?: string }[];
  people: { id: string; name: string }[];
  messages: { id: string; subject: string | null; fromName: string | null; snippet: string; receivedAt: string; permalink: string | null }[];
  meetings: { id: string; title: string; startAt: string; permalink: string | null }[];
  files: { id: string; name: string; webUrl: string | null; modifiedAt: string }[];
  deadlines: { title: string; due: string; kind: "project" | "task" }[];
  nextStep?: string;
}

const tabs = ["Overview", "Tasks", "Messages", "Meetings", "Files", "People"] as const;
const accent = { OnTrack: "green", AtRisk: "yellow", Behind: "red", Completed: "green" } as const;
const label = { OnTrack: "On track", AtRisk: "At risk", Behind: "Behind", Completed: "Completed" } as const;
const questions = ["What's blocking this project?", "What changed this week?", "Who is waiting on whom?", "What should happen next?"];

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-sm text-neutral-400">{children}</p>;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [intel, setIntel] = useState<Intel | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [refreshing, setRefreshing] = useState(false);
  const [question, setQuestion] = useState("");
  const [proposed, setProposed] = useState<PendingActionData | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      const res = await fetch(`/api/projects/${params.id}/intel${refresh ? "?refresh=1" : ""}`);
      if (res.status === 404) return setMissing(true);
      if (res.ok) setIntel(await res.json());
    },
    [params.id],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${params.id}/intel`).then(async (res) => {
      if (cancelled) return;
      if (res.status === 404) setMissing(true);
      else if (res.ok) setIntel(await res.json());
    });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function refresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  async function proposeStatus(status: ProjectStatus) {
    if (!intel || status === intel.project.status) return;
    setProposeError(null);
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "UpdateProjectStatus", payload: { projectId: intel.project.id, status } }),
    });
    const body = await res.json();
    if (res.ok) setProposed(body.action);
    else setProposeError(body.error ?? "Couldn't propose that change.");
  }

  function ask(q: string) {
    if (q.trim()) router.push(`/ai?project=${params.id}&q=${encodeURIComponent(q.trim())}`);
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-lg font-semibold text-ink">Project not found</p>
        <Link href="/projects" className="mt-2 inline-block text-sm text-blue hover:underline">Back to projects</Link>
      </div>
    );
  }
  if (!intel) return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-neutral-400 sm:px-8">Reading this project...</div>;

  const { project, progress } = intel;
  const pct = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{project.name}</h1>
            <Badge accent={accent[project.status]}>{label[project.status]}</Badge>
          </div>
          {project.description && <p className="mt-1.5 text-neutral-500">{project.description}</p>}
        </div>
        <label className="text-xs text-neutral-400">
          Status
          <select
            value={project.status}
            onChange={(e) => proposeStatus(e.target.value as ProjectStatus)}
            className="ml-2 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm text-ink"
          >
            {(Object.keys(label) as ProjectStatus[]).map((s) => <option key={s} value={s}>{label[s]}</option>)}
          </select>
        </label>
      </div>
      {proposed && <div className="max-w-md"><ActionCard action={proposed} onResolved={(s) => { if (s === "approved") load(); setProposed(null); }} /></div>}
      {proposeError && <p className="mt-2 text-sm text-red">{proposeError}</p>}

      <div className="mt-5 flex items-center gap-3">
        <div className="h-2 max-w-xs flex-1 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-blue" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-medium text-neutral-500">{pct}% &middot; {progress.completed}/{progress.total} tasks{project.deadline ? ` · due ${fmt(project.deadline)}` : ""}</span>
      </div>

      <Card className="mt-6 border-blue/20 bg-gradient-to-br from-blue-soft/50 to-white">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue"><Sparkles size={13} /> AI summary</p>
          <button onClick={refresh} disabled={refreshing} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-ink disabled:opacity-50">
            <RefreshCw size={12} className={refreshing ? "animate-spin" : undefined} /> Refresh
          </button>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">{intel.summary.text}</p>
        <p className="mt-2 text-xs text-neutral-400">
          {intel.summary.source === "ai" ? "Written by STACK AI from this project's real tasks and linked messages." : "Generated from this project's tasks and linked messages."}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="mt-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-1.5 pl-3">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about this project..." className="flex-1 text-sm outline-none placeholder:text-neutral-400" />
          <button type="submit" className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40" disabled={!question.trim()}>Ask</button>
        </form>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {questions.map((q) => (
            <button key={q} onClick={() => ask(q)} className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-500 hover:border-ink hover:text-ink">{q}</button>
          ))}
        </div>
      </Card>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-neutral-100">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium", tab === t ? "border-ink text-ink" : "border-transparent text-neutral-400 hover:text-ink")}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Overview" && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              {intel.nextStep && (
                <div className="rounded-xl bg-blue-soft/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue">Recommended next step</p>
                  <p className="mt-0.5 flex items-start gap-1.5 text-sm text-ink"><ArrowRight size={14} className="mt-0.5 shrink-0 text-blue" /> {intel.nextStep}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Blockers</p>
                {intel.blockers.length === 0 ? <p className="mt-2 text-sm text-neutral-400">Nothing is blocked.</p> : (
                  <ul className="mt-2 space-y-2">
                    {intel.blockers.map((b) => (
                      <li key={b.taskId} className="rounded-lg border border-red/20 bg-red-soft/40 px-3 py-2 text-sm"><span className="font-medium text-ink">{b.title}</span>{b.reason && <span className="text-neutral-500"> - {b.reason}</span>}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Who is waiting on whom</p>
                {intel.waiting.length === 0 ? <p className="mt-2 text-sm text-neutral-400">No one is waiting on anyone.</p> : (
                  <ul className="mt-2 space-y-1.5">
                    {intel.waiting.map((w) => <li key={w.taskId} className="text-sm text-ink">{w.owner ?? "Someone"} is waiting on {w.waitingOn ?? "someone"} <span className="text-neutral-400">- {w.title}</span></li>)}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Deadlines</p>
              {intel.deadlines.length === 0 ? <p className="mt-2 text-sm text-neutral-400">No deadlines set.</p> : (
                <ul className="mt-2 space-y-1.5">
                  {intel.deadlines.map((d) => (
                    <li key={`${d.kind}${d.title}${d.due}`} className="flex justify-between gap-3 text-sm">
                      <span className={cn("truncate", new Date(d.due) < new Date() ? "text-red" : "text-ink")}>{d.title}</span>
                      <span className="shrink-0 text-neutral-400">{fmt(d.due)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "Tasks" && (
          intel.tasks.length === 0 ? <Empty>No tasks in this project yet.</Empty> : (
            <Card className="p-0">
              {intel.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 border-b border-neutral-50 px-5 py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm text-ink", t.status === "Done" && "text-neutral-400 line-through")}>{t.title}</p>
                    <p className="text-xs text-neutral-400">{[t.assignee, t.dueDate && `due ${fmt(t.dueDate)}`, t.waitingOn && `waiting on ${t.waitingOn}`, t.blockedReason].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Badge accent={t.status === "Blocked" ? "red" : t.status === "Done" ? "green" : "neutral"}>{t.status === "InProgress" ? "In progress" : t.status}</Badge>
                </div>
              ))}
            </Card>
          )
        )}

        {tab === "Messages" && (
          intel.messages.length === 0 ? <Empty>No linked messages. Connect Gmail or Slack and sync - STACK links messages that mention this project or its tasks.</Empty> : (
            <Card className="p-0">
              {intel.messages.map((m) => (
                <div key={m.id} className="flex items-start gap-3 border-b border-neutral-50 px-5 py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{m.subject ?? "(no subject)"} <span className="font-normal text-neutral-400">- {m.fromName}</span></p>
                    <p className="line-clamp-2 text-xs text-neutral-500">{m.snippet}</p>
                  </div>
                  {m.permalink && <a href={m.permalink} target="_blank" rel="noopener noreferrer" className="shrink-0 text-neutral-400 hover:text-ink"><ExternalLink size={14} /></a>}
                </div>
              ))}
            </Card>
          )
        )}

        {tab === "Meetings" && (
          intel.meetings.length === 0 ? <Empty>No linked meetings. Connect a calendar and sync to see meetings that mention this project.</Empty> : (
            <Card className="p-0">
              {intel.meetings.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 border-b border-neutral-50 px-5 py-3 text-sm last:border-0">
                  <span className="truncate text-ink">{m.title}</span>
                  <span className="shrink-0 text-neutral-400">{fmt(m.startAt)}</span>
                </div>
              ))}
            </Card>
          )
        )}

        {tab === "Files" && (
          intel.files.length === 0 ? <Empty>No linked files. Connect Drive or OneDrive and sync - STACK links files whose names mention this project.</Empty> : (
            <Card className="p-0">
              {intel.files.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 border-b border-neutral-50 px-5 py-3 text-sm last:border-0">
                  {f.webUrl ? <a href={f.webUrl} target="_blank" rel="noopener noreferrer" className="truncate text-ink hover:underline">{f.name}</a> : <span className="truncate text-ink">{f.name}</span>}
                  <span className="shrink-0 text-neutral-400">{fmt(f.modifiedAt)}</span>
                </div>
              ))}
            </Card>
          )
        )}

        {tab === "People" && (
          intel.people.length === 0 ? <Empty>No one is assigned to tasks in this project yet.</Empty> : (
            <div className="flex flex-wrap gap-2">
              {intel.people.map((p) => <span key={p.id} className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm text-ink">{p.name}</span>)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
