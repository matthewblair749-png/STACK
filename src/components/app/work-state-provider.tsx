"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DailyBrief, WorkState } from "@/lib/work-types";
import { useToast } from "./toast";

const CACHE_KEY = "stack-work-state-v2";
const POLL_MS = 60_000;
const RESYNC_AFTER_MS = 5 * 60 * 1000;

type Status = "loading" | "ready" | "error";

interface WorkStateContextValue {
  state: WorkState | null;
  brief: DailyBrief | null;
  status: Status;
  syncing: boolean;
  /** Problems reported by the most recent sync (e.g. an API that is switched off), per app. */
  syncIssues: { provider: string; error: string }[];
  /** Re-read the computed picture (cheap). */
  refresh: () => Promise<void>;
  /** Pull fresh data from connected apps, then refresh. */
  syncNow: () => Promise<void>;
}

const WorkStateContext = createContext<WorkStateContextValue | null>(null);

export function useWorkState() {
  const ctx = useContext(WorkStateContext);
  if (!ctx) throw new Error("useWorkState must be used within WorkStateProvider");
  return ctx;
}

/**
 * Shared, stay-fresh view of the user's work. Shows the last known picture instantly (session cache),
 * revalidates in the background, refreshes every minute while the tab is visible, and re-syncs the
 * connected apps when the last sync is stale - so the dashboard never needs a manual reload.
 */
export function WorkStateProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [state, setState] = useState<WorkState | null>(null);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [syncing, setSyncing] = useState(false);
  const [syncIssues, setSyncIssues] = useState<{ provider: string; error: string }[]>([]);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/work/state");
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      setState(body.state);
      setBrief(body.brief);
      setStatus("ready");
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(body));
      } catch {
        // Storage full or unavailable - the cache is only an optimisation.
      }
    } catch {
      setStatus((s) => (s === "ready" ? s : "error"));
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/sync", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Couldn't sync", description: body.error ?? "Try again in a moment.", tone: "error" });
      } else {
        const failed = (body.perProvider ?? []).filter((p: { error?: string }) => p.error);
        setSyncIssues(failed);
        if (failed.length) toast({ title: "Some apps couldn't sync", description: failed.map((p: { provider: string; error: string }) => `${p.provider}: ${p.error}`).join(" | "), tone: "error" });
      }
      await refresh();
    } catch {
      toast({ title: "Couldn't reach STACK", description: "Check your connection and try again.", tone: "error" });
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refresh, toast]);

  // First paint from cache, then revalidate; auto-sync once if the last sync is stale.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const body = JSON.parse(cached);
          if (!cancelled) {
            setState(body.state);
            setBrief(body.brief);
            setStatus("ready");
          }
        }
      } catch {
        // Ignore a corrupt cache entry.
      }
      await refresh();
      if (cancelled) return;
      try {
        const fresh = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null")?.state as WorkState | undefined;
        const stale = fresh && (!fresh.lastSyncAt || Date.now() - new Date(fresh.lastSyncAt).getTime() > RESYNC_AFTER_MS);
        if (fresh && fresh.connectedProviders.length > 0 && stale) await syncNow();
      } catch {
        // Cache unreadable - skip the auto-sync, the user can sync manually.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, syncNow]);

  // Background updates while the tab is visible.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const value = useMemo(() => ({ state, brief, status, syncing, syncIssues, refresh, syncNow }), [state, brief, status, syncing, syncIssues, refresh, syncNow]);
  return <WorkStateContext.Provider value={value}>{children}</WorkStateContext.Provider>;
}
