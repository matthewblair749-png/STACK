"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Task, Project, Person, OpenTab, RecentlyClosedTab, SourceApp, Insight } from "./types";
import { getOpenTabsLimit, type PlanId } from "./plan-limits";
import { openableApps } from "./open-tabs-data";

const STORAGE_KEY = "stack-demo-open-tabs-v1";
const RECENTLY_CLOSED_LIMIT = 10;

interface PersistedState {
  tabs: OpenTab[];
  activeTabId: string | null;
  recentlyClosed: RecentlyClosedTab[];
}

const PLAN_FROM_API: Record<string, PlanId> = {
  Free: "free",
  Solo: "solo",
  Team: "team",
  Business: "business",
  Enterprise: "enterprise",
};

type OpenAppResult = { ok: true; tabId: string } | { ok: false; reason: "limit" };

interface Workspace {
  id: string;
  name: string;
  role: string;
}

interface DemoState {
  tasks: Task[];
  toggleTask: (id: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;

  projects: Project[];
  addProject: (input: { name: string; description?: string }) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  people: Person[];
  /** Parts of the workspace that failed to load (e.g. "tasks"); empty when everything loaded. */
  loadErrors: string[];
  reload: () => void;
  workspace: Workspace | null;
  setWorkspace: (workspace: Workspace) => void;

  insights: Insight[];
  dismissInsight: (id: string) => void;

  plan: PlanId;
  openTabsLimit: number;
  /** True only when paid plans can really be bought (billing configured) and this workspace is on Free. */
  canUpgrade: boolean;

  openTabs: OpenTab[];
  activeTabId: string | null;
  recentlyClosed: RecentlyClosedTab[];
  openApp: (appId: SourceApp, title?: string) => OpenAppResult;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  setActiveTab: (id: string) => void;
  reorderGroup: (order: OpenTab[], group: "pinned" | "normal") => void;
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  renameTab: (id: string, title: string) => void;
  duplicateTab: (id: string) => OpenAppResult;
  refreshTab: (id: string) => void;
  reopenClosed: (entry: RecentlyClosedTab) => OpenAppResult;
  cycleTab: (direction: 1 | -1) => void;
}

const DemoContext = createContext<DemoState | null>(null);

function loadPersisted(): Partial<PersistedState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedState>) : null;
  } catch {
    return null;
  }
}

async function apiCall<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request to ${url} failed (${res.status}).`);
  }
  return body as T;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);

  const [plan, setPlan] = useState<PlanId>("free");
  // While no payment provider is set up nothing can be bought, so early access gets the paid limits
  // instead of a cap with an "upgrade" that can't complete.
  const [billingConfigured, setBillingConfigured] = useState(true);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [recentlyClosed, setRecentlyClosed] = useState<RecentlyClosedTab[]>([]);
  const hydrated = useRef(false);
  const nextTabId = useRef(0);

  // Load real workspace-scoped data. A failure is recorded (not swallowed) so the app can say so and offer a
  // retry, instead of showing "Loading..." forever.
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const load = useCallback(() => {
    setLoadErrors([]);
    const track = (part: string, p: Promise<unknown>) =>
      p.catch(() => setLoadErrors((prev) => (prev.includes(part) ? prev : [...prev, part])));
    track("tasks", apiCall<{ tasks: Task[] }>("/api/tasks").then((d) => setTasks(d.tasks)));
    track("projects", apiCall<{ projects: Project[] }>("/api/projects").then((d) => setProjects(d.projects)));
    track("team", apiCall<{ people: Person[] }>("/api/workspace/members").then((d) => setPeople(d.people)));
    track("workspace", apiCall<{ workspace: Workspace }>("/api/workspace").then((d) => setWorkspace(d.workspace)));
    track("insights", apiCall<{ insights: Insight[] }>("/api/insights").then((d) => setInsights(d.insights)));
    track(
      "plan",
      apiCall<{ plan: string; configured: boolean }>("/api/billing/status").then((d) => {
        setPlan(PLAN_FROM_API[d.plan] ?? "free");
        setBillingConfigured(d.configured);
      }),
    );
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  // Restore Open Tabs state from localStorage after mount (client-only, avoids
  // hydration mismatches since server-rendered markup has no tabs yet).
  useEffect(() => {
    const persisted = loadPersisted();
    if (!persisted) {
      hydrated.current = true;
      return;
    }
    queueMicrotask(() => {
      if (persisted.tabs) setOpenTabs(persisted.tabs);
      if (persisted.activeTabId !== undefined) setActiveTabId(persisted.activeTabId);
      if (persisted.recentlyClosed) setRecentlyClosed(persisted.recentlyClosed);
      nextTabId.current = (persisted.tabs?.length ?? 0) + (persisted.recentlyClosed?.length ?? 0) + 1;
      hydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      const payload: PersistedState = { tabs: openTabs, activeTabId, recentlyClosed };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage unavailable (private mode, quota) — Open Tabs state just won't persist.
    }
  }, [openTabs, activeTabId, recentlyClosed]);

  const openTabsLimit = billingConfigured ? getOpenTabsLimit(plan) : getOpenTabsLimit("solo");
  const canUpgrade = billingConfigured && plan === "free";

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      apiCall(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ done: !target.done }) }).catch(() => {
        setTasks((rollback) => rollback.map((t) => (t.id === id ? { ...t, done: target.done } : t)));
      });
      return prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    });
  }, []);

  const addTask = useCallback((task: Task) => {
    const tempId = task.id;
    setTasks((prev) => [task, ...prev]);
    apiCall<{ task: Task }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        priority: task.priority,
        projectId: task.projectId,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        labels: task.labels,
      }),
    })
      .then(({ task: created }) => {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
      })
      .catch(() => {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      });
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    apiCall<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
      .then(({ task: updated }) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch(() => {});
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    apiCall(`/api/tasks/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const addProject = useCallback((input: { name: string; description?: string }) => {
    apiCall<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(input) })
      .then(({ project }) => setProjects((prev) => [project, ...prev]))
      .catch(() => {});
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    apiCall<{ project: Project }>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
      .then(({ project }) => setProjects((prev) => prev.map((p) => (p.id === id ? project : p))))
      .catch(() => {});
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    apiCall(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const dismissInsight = useCallback((id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    apiCall(`/api/insights/${id}`, { method: "PATCH", body: JSON.stringify({ status: "Dismissed" }) }).catch(() => {});
  }, []);

  const appName = useCallback(
    (appId: string) => openableApps.find((a) => a.id === appId)?.name ?? appId,
    [],
  );

  const openApp = useCallback(
    (appId: SourceApp, title?: string): OpenAppResult => {
      const existing = openTabs.find((t) => t.appId === appId);
      if (existing) {
        setActiveTabId(existing.id);
        return { ok: true, tabId: existing.id };
      }
      if (openTabs.length >= openTabsLimit) return { ok: false, reason: "limit" };
      const id = `tab${nextTabId.current++}`;
      const tab: OpenTab = { id, appId, title: title ?? appName(appId), pinned: false, refreshKey: 0 };
      setOpenTabs((prev) => [...prev, tab]);
      setActiveTabId(id);
      return { ok: true, tabId: id };
    },
    [openTabs, openTabsLimit, appName],
  );

  const closeTab = useCallback(
    (id: string) => {
      const idx = openTabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const target = openTabs[idx];
      const next = openTabs.filter((t) => t.id !== id);

      setOpenTabs(next);
      setRecentlyClosed((rc) =>
        [{ id: `closed${nextTabId.current++}`, appId: target.appId, title: target.title, closedAt: Date.now() }, ...rc].slice(
          0,
          RECENTLY_CLOSED_LIMIT,
        ),
      );
      setActiveTabId((current) =>
        current !== id ? current : next[idx]?.id ?? next[idx - 1]?.id ?? next[next.length - 1]?.id ?? null,
      );
    },
    [openTabs],
  );

  const displayOrder = useMemo(() => {
    const pinned = openTabs.filter((t) => t.pinned);
    const normal = openTabs.filter((t) => !t.pinned);
    return [...pinned, ...normal];
  }, [openTabs]);

  const closeOtherTabs = useCallback(
    (id: string) => {
      setOpenTabs((prev) => prev.filter((t) => t.id === id || t.pinned));
      setActiveTabId(id);
    },
    [],
  );

  const closeTabsToRight = useCallback(
    (id: string) => {
      const idx = displayOrder.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const keepIds = new Set(displayOrder.slice(0, idx + 1).map((t) => t.id));
      setOpenTabs((prev) => prev.filter((t) => keepIds.has(t.id)));
      setActiveTabId((current) => (current && keepIds.has(current) ? current : id));
    },
    [displayOrder],
  );

  const reorderGroup = useCallback((order: OpenTab[], group: "pinned" | "normal") => {
    setOpenTabs((prev) => {
      const pinned = prev.filter((t) => t.pinned);
      const normal = prev.filter((t) => !t.pinned);
      return group === "pinned" ? [...order, ...normal] : [...pinned, ...order];
    });
  }, []);

  const pinTab = useCallback((id: string) => {
    setOpenTabs((prev) => prev.map((t) => (t.id === id ? { ...t, pinned: true } : t)));
  }, []);

  const unpinTab = useCallback((id: string) => {
    setOpenTabs((prev) => prev.map((t) => (t.id === id ? { ...t, pinned: false } : t)));
  }, []);

  const renameTab = useCallback((id: string, title: string) => {
    setOpenTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }, []);

  const duplicateTab = useCallback(
    (id: string): OpenAppResult => {
      const source = openTabs.find((t) => t.id === id);
      if (!source) return { ok: false, reason: "limit" };
      if (openTabs.length >= openTabsLimit) return { ok: false, reason: "limit" };
      const newId = `tab${nextTabId.current++}`;
      const clone: OpenTab = { ...source, id: newId, pinned: false };
      setOpenTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)];
      });
      setActiveTabId(newId);
      return { ok: true, tabId: newId };
    },
    [openTabs, openTabsLimit],
  );

  const refreshTab = useCallback((id: string) => {
    setOpenTabs((prev) => prev.map((t) => (t.id === id ? { ...t, refreshKey: t.refreshKey + 1 } : t)));
  }, []);

  const reopenClosed = useCallback(
    (entry: RecentlyClosedTab): OpenAppResult => {
      const result = openApp(entry.appId, entry.title);
      if (result.ok) setRecentlyClosed((prev) => prev.filter((e) => e.id !== entry.id));
      return result;
    },
    [openApp],
  );

  const cycleTab = useCallback(
    (direction: 1 | -1) => {
      if (displayOrder.length === 0) return;
      const idx = displayOrder.findIndex((t) => t.id === activeTabId);
      const nextIdx = idx === -1 ? 0 : (idx + direction + displayOrder.length) % displayOrder.length;
      setActiveTabId(displayOrder[nextIdx].id);
    },
    [displayOrder, activeTabId],
  );

  const value = useMemo<DemoState>(
    () => ({
      tasks,
      toggleTask,
      addTask,
      updateTask,
      deleteTask,
      commandOpen,
      setCommandOpen,

      projects,
      addProject,
      updateProject,
      deleteProject,

      people,
      loadErrors,
      reload: load,
      workspace,
      setWorkspace,

      insights,
      dismissInsight,

      plan,
      openTabsLimit,
      canUpgrade,

      openTabs,
      activeTabId,
      recentlyClosed,
      openApp,
      closeTab,
      closeOtherTabs,
      closeTabsToRight,
      setActiveTab: setActiveTabId,
      reorderGroup,
      pinTab,
      unpinTab,
      renameTab,
      duplicateTab,
      refreshTab,
      reopenClosed,
      cycleTab,
    }),
    [
      tasks,
      toggleTask,
      addTask,
      updateTask,
      deleteTask,
      commandOpen,
      projects,
      addProject,
      updateProject,
      deleteProject,
      people,
      loadErrors,
      load,
      workspace,
      setWorkspace,
      insights,
      dismissInsight,
      plan,
      openTabsLimit,
      canUpgrade,
      openTabs,
      activeTabId,
      recentlyClosed,
      openApp,
      closeTab,
      closeOtherTabs,
      closeTabsToRight,
      reorderGroup,
      pinTab,
      unpinTab,
      renameTab,
      duplicateTab,
      refreshTab,
      reopenClosed,
      cycleTab,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
