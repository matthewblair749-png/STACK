"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { DEFAULT_SUGGESTIONS } from "@/components/app/ask-stack-bar";
import type { PendingActionData } from "@/components/app/action-card";
import { HomeView, type ConnectedApp, type SuggestedApp } from "@/components/app/home-view";
import { isExternal } from "@/components/app/home-parts";
import { TaskModal } from "@/components/app/task-modal";
import { useToast } from "@/components/app/toast";
import { useWorkState } from "@/components/app/work-state-provider";
import { useDemo } from "@/lib/demo-context";
import type { ProjectCard, WorkAction } from "@/lib/work-types";
import type { Task } from "@/lib/types";

interface Me {
  user: { name: string | null; profession: string | null } | null;
  profession: { slug: string; name: string } | null;
}

/** Suggested commands adapt to what the person does. */
function suggestionsFor(profession?: string | null): string[] {
  const p = (profession ?? "").toLowerCase();
  if (/developer|engineer|devops|qa|data|security|it-/.test(p)) return ["What's blocking the release?", "Summarize my open issues", "Catch me up", "What am I waiting on?", "Find the latest design doc", "Prepare my standup"];
  if (/sales|customer|account|recruiter|marketing|seo|social|brand/.test(p)) return ["Prepare me for my next client", "Which leads need attention?", "Catch me up", "What am I waiting on?", "Find the latest proposal", "Draft a follow-up"];
  if (/lawyer|paralegal|legal|compliance|court/.test(p)) return ["What deadlines are coming up?", "Catch me up on my matters", "Prepare my next meeting", "What am I waiting on?", "Find the latest contract", "Draft a response"];
  if (/doctor|nurse|pharmacist|dentist|medical|health|radiology/.test(p)) return ["What needs my attention today?", "Prepare my next meeting", "What am I waiting on?", "Catch me up", "Find the latest protocol", "Draft a response"];
  return DEFAULT_SUGGESTIONS;
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
            setSuggested(list.filter((x) => x.supported && x.status !== "connected" && (x.configured || x.tokenConnect)).slice(0, 6));
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

  function run(action: WorkAction) {
    if (action.command) router.push(`/ai?q=${encodeURIComponent(action.command)}`);
    else if (action.intent === "new-task") setModalOpen(true);
    else if (action.intent === "review-approvals") document.getElementById("approvals")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
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

  return (
    <HomeView
      state={state}
      brief={brief}
      loading={status === "loading" || !state}
      apps={apps}
      connected={connected}
      noApps={noApps}
      syncing={syncing}
      syncIssues={syncIssues}
      hasConnectionError={(apps ?? []).some((a) => a.status === "error") || status === "error"}
      onSync={syncNow}
      projects={projects}
      pending={pending}
      suggested={suggested}
      professionName={me?.profession?.name}
      suggestions={suggestionsFor(me?.profession?.slug ?? me?.user?.profession)}
      dismissed={dismissed}
      reduceMotion={!!reduce}
      onRun={run}
      onJump={jump}
      onDismissNextStep={dismissNextStep}
      onActionResolved={(id, s) => {
        if (s === "approved") toast({ title: "Done", description: "STACK completed the action you approved.", tone: "success" });
        setTimeout(() => {
          setPending((list) => list.filter((x) => x.id !== id));
          refresh();
          loadSide();
        }, 1200);
      }}
    >
      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveTask} initial={null} />
    </HomeView>
  );
}
