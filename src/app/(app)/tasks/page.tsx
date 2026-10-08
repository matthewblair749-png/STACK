"use client";

import { useMemo, useState } from "react";
import {
  Search, Plus, List as ListIcon, Kanban, GanttChart, Calendar as CalendarIcon,
  Circle, CheckCircle2, ChevronDown, MessageSquareText, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useDemo } from "@/lib/demo-context";
import { useSyncedList } from "@/lib/use-synced-list";
import { externalToTask, type SyncedWorkItem } from "@/lib/external-tasks";
import { providerLabel } from "@/lib/providers-meta";
import { IntegrationLogo } from "@/components/brand-icons";
import type { Priority, Task } from "@/lib/types";
import { PriorityDot, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskModal } from "@/components/app/task-modal";
import { KpiTile } from "@/components/app/kpi-tile";
import { getOpenTasks, getUrgentOpenTasks, getOverdueTasks, getCompletedTasks } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";

function isOverdue(task: Task) {
  return !task.done && !!task.dueDate && new Date(task.dueDate).getTime() < Date.now();
}

function formatDueDate(dueDate?: string) {
  if (!dueDate) return undefined;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return dueDate;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

type View = "list" | "board" | "timeline" | "calendar";

const priorityOrder: Record<Priority, number> = { urgent: 0, important: 1, normal: 2 };

export default function TasksPage() {
  const { tasks: ownTasks, toggleTask: toggleOwn, addTask, updateTask: updateOwn, deleteTask, projects, people } = useDemo();
  const external = useSyncedList<SyncedWorkItem>("messages", { group: "work" });
  const externalTasks = useMemo(() => external.items.map(externalToTask), [external.items]);
  const tasks = useMemo(() => [...ownTasks, ...externalTasks], [ownTasks, externalTasks]);
  const toggleTask = (id: string) => {
    if (!id.startsWith("ext:")) toggleOwn(id);
  };
  const updateTask = (id: string, patch: Partial<Task>) => {
    if (!id.startsWith("ext:")) updateOwn(id, patch);
  };
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const personName = (id?: string) => people.find((p) => p.id === id)?.name;
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"priority" | "due" | "created">("priority");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const externalProviders = useMemo(() => [...new Set(externalTasks.map((t) => t.external!.provider))], [externalTasks]);

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));
    if (priorityFilter !== "all") list = list.filter((t) => t.priority === priorityFilter);
    if (sourceFilter === "stack") list = list.filter((t) => !t.external);
    else if (sourceFilter !== "all") list = list.filter((t) => t.external?.provider === sourceFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === "priority") return priorityOrder[a.priority] - priorityOrder[b.priority];
      if (sortBy === "created") return a.createdAt.localeCompare(b.createdAt);
      return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
    });
    return list;
  }, [tasks, query, priorityFilter, sourceFilter, sortBy]);

  function projectName(id?: string) {
    return projects.find((p) => p.id === id)?.name;
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(t: Task) {
    // Items from other apps are changed in that app, so open them there instead of an edit form.
    if (t.external) {
      if (t.external.url) window.open(t.external.url, "_blank", "noopener,noreferrer");
      return;
    }
    setEditing(t);
    setModalOpen(true);
  }
  function handleSave(t: Task) {
    if (editing) updateTask(editing.id, t);
    else addTask(t);
  }

  const openTasks = getOpenTasks(tasks);
  const urgentTasks = getUrgentOpenTasks(tasks);
  const overdueTasks = getOverdueTasks(tasks);
  const completedTasks = getCompletedTasks(tasks);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Active" value={openTasks.length} trend="Open" trendAccent="neutral" />
        <KpiTile
          label="Urgent"
          value={urgentTasks.length}
          trend={urgentTasks.length > 0 ? "Needs attention" : "Clear"}
          trendAccent={urgentTasks.length > 0 ? "red" : "green"}
        />
        <KpiTile
          label="Overdue"
          value={overdueTasks.length}
          trend={overdueTasks.length > 0 ? "Past due" : "On track"}
          trendAccent={overdueTasks.length > 0 ? "red" : "green"}
        />
        <KpiTile label="Completed" value={completedTasks.length} trend="Done" trendAccent="green" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
          <Search size={15} className="text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            className="w-40 text-sm outline-none placeholder:text-neutral-400"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | "all")}
          aria-label="Filter by priority"
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 outline-none"
        >
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="important">Important</option>
          <option value="normal">Normal</option>
        </select>

        {externalProviders.length > 0 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filter by source"
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 outline-none"
          >
            <option value="all">All sources</option>
            <option value="stack">STACK</option>
            {externalProviders.map((p) => (
              <option key={p} value={p}>{providerLabel(p)}</option>
            ))}
          </select>
        )}

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          aria-label="Sort tasks"
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 outline-none"
        >
          <option value="priority">Sort: Priority</option>
          <option value="due">Sort: Due date</option>
          <option value="created">Sort: Created</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-xl border border-neutral-200 p-1">
            {[
              { v: "list", icon: ListIcon },
              { v: "board", icon: Kanban },
              { v: "timeline", icon: GanttChart },
              { v: "calendar", icon: CalendarIcon },
            ].map(({ v, icon: Icon }) => (
              <button
                key={v}
                onClick={() => setView(v as View)}
                className={cn("flex h-8 w-8 items-center justify-center rounded-lg capitalize", view === v ? "bg-neutral-100 text-ink" : "text-neutral-400")}
                title={v}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openNew}><Plus size={14} /> New task</Button>
        </div>
      </div>

      {external.error && (
        <p className="mt-4 rounded-xl bg-red-soft px-4 py-3 text-sm text-red">
          Couldn&apos;t load tasks from your connected apps. <button onClick={external.reload} className="font-semibold underline">Try again</button>
        </p>
      )}

      <div className="mt-6">
        {view === "list" && (
          <ListView tasks={filtered} toggleTask={toggleTask} openEdit={openEdit} projectName={projectName} userId={userId} personName={personName} />
        )}
        {view === "board" && (
          <BoardView tasks={filtered} updateTask={updateTask} openEdit={openEdit} projectName={projectName} />
        )}
        {view === "timeline" && <TimelineView tasks={filtered} projectName={projectName} openEdit={openEdit} />}
        {view === "calendar" && <CalendarView tasks={filtered} openEdit={openEdit} />}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={editing ? () => { deleteTask(editing.id); setModalOpen(false); } : undefined}
        initial={editing}
      />
    </div>
  );
}

function TaskRow({
  task,
  toggleTask,
  openEdit,
  projectName,
  personName,
}: {
  task: Task;
  toggleTask: (id: string) => void;
  openEdit: (t: Task) => void;
  projectName: (id?: string) => string | undefined;
  personName?: (id?: string) => string | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const doneSubtasks = task.subtasks.filter((s) => s.done).length;

  return (
    <div className="border-b border-neutral-100 last:border-0">
      <div className="flex items-center gap-3 px-2 py-2.5">
        {task.external ? (
          <span title={`Lives in ${providerLabel(task.external.provider)}`} className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
            <IntegrationLogo app={task.external.provider} name={providerLabel(task.external.provider)} size="md" />
          </span>
        ) : (
          <button onClick={() => toggleTask(task.id)} aria-label={task.done ? "Mark as not done" : "Mark as done"}>
            {task.done ? <CheckCircle2 size={18} className="text-blue" /> : <Circle size={18} className="text-neutral-300" />}
          </button>
        )}
        <button onClick={() => openEdit(task)} className="flex-1 text-left">
          <p className={cn("text-sm text-ink", task.done && "text-neutral-400 line-through")}>{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            {task.external && <Badge accent="neutral">{task.external.container ?? providerLabel(task.external.provider)}</Badge>}
            {isOverdue(task) && <Badge accent="red">Overdue</Badge>}
            {task.status === "Blocked" && <Badge accent="red">Blocked{task.blockedReason ? `: ${task.blockedReason}` : ""}</Badge>}
            {task.waitingOnId && !task.done && <Badge accent="yellow">Waiting on {personName?.(task.waitingOnId) ?? "someone"}</Badge>}
            {projectName(task.projectId) && <Badge accent="neutral">{projectName(task.projectId)}</Badge>}
            {task.dueDate && <span>{formatDueDate(task.dueDate)}</span>}
            {task.labels.map((l) => <span key={l} className="text-neutral-400">#{l}</span>)}
          </div>
        </button>
        <PriorityDot priority={task.priority} />
        {task.external?.url && <ExternalLink size={13} className="shrink-0 text-neutral-300" aria-label={`Opens in ${providerLabel(task.external.provider)}`} />}
        {task.subtasks.length > 0 && (
          <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1 text-xs text-neutral-400">
            <MessageSquareText size={13} /> {doneSubtasks}/{task.subtasks.length}
            <ChevronDown size={12} className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && task.subtasks.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-10 pb-2">
            {task.subtasks.map((s) => (
              <div key={s.id} className="flex items-center gap-2 py-1 text-xs text-neutral-500">
                <span className={cn("h-1.5 w-1.5 rounded-full", s.done ? "bg-blue" : "bg-neutral-300")} />
                <span className={cn(s.done && "line-through")}>{s.title}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ListView({
  tasks,
  toggleTask,
  openEdit,
  projectName,
  userId,
  personName,
}: {
  tasks: Task[];
  toggleTask: (id: string) => void;
  openEdit: (t: Task) => void;
  projectName: (id?: string) => string | undefined;
  userId?: string;
  personName: (id?: string) => string | undefined;
}) {
  const open = tasks.filter((t) => !t.done);
  const blocked = open.filter((t) => t.status === "Blocked");
  const rest = open.filter((t) => t.status !== "Blocked");
  const waitingOnMe = rest.filter((t) => t.waitingOnId && t.waitingOnId === userId);
  const waitingOnOthers = rest.filter((t) => t.waitingOnId && t.waitingOnId !== userId);
  const free = rest.filter((t) => !t.waitingOnId);
  const today = free.filter((t) => isOverdue(t) || (!!t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()));
  const nextUp = free.filter((t) => !today.includes(t));
  const done = tasks.filter((t) => t.done);

  const groups: { label: string; hint: string; list: Task[] }[] = [
    { label: "Today", hint: "Due today or overdue", list: today },
    { label: "Blocked", hint: "Can't move until something is resolved", list: blocked },
    { label: "Waiting on me", hint: "Others are waiting for you", list: waitingOnMe },
    { label: "Waiting on others", hint: "You're waiting for someone", list: waitingOnOthers },
    { label: "Next up", hint: "Ready to start", list: nextUp },
  ];

  return (
    <div className="rounded-xl border border-neutral-100 bg-white">
      {groups.map((g) =>
        g.list.length === 0 ? null : (
          <div key={g.label} className="border-b border-neutral-100 pb-2 last:border-0">
            <div className="flex items-baseline gap-2 px-4 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{g.label} · {g.list.length}</p>
              <p className="text-xs text-neutral-300">{g.hint}</p>
            </div>
            <div className="px-2">
              {g.list.map((t) => <TaskRow key={t.id} task={t} toggleTask={toggleTask} openEdit={openEdit} projectName={projectName} personName={personName} />)}
            </div>
          </div>
        ),
      )}
      {open.length === 0 && <p className="px-2 py-6 text-center text-sm text-neutral-400">No open tasks match your filters.</p>}
      {done.length > 0 && (
        <div className="border-t border-neutral-100">
          <div className="px-4 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Completed · {done.length}</p>
          </div>
          <div className="px-2 pb-2">
            {done.map((t) => <TaskRow key={t.id} task={t} toggleTask={toggleTask} openEdit={openEdit} projectName={projectName} personName={personName} />)}
          </div>
        </div>
      )}
    </div>
  );
}
function BoardView({
  tasks,
  updateTask,
  openEdit,
  projectName,
}: {
  tasks: Task[];
  updateTask: (id: string, patch: Partial<Task>) => void;
  openEdit: (t: Task) => void;
  projectName: (id?: string) => string | undefined;
}) {
  const columns: { key: Priority; label: string; dot: string }[] = [
    { key: "urgent", label: "Urgent", dot: "bg-red" },
    { key: "important", label: "Important", dot: "bg-yellow" },
    { key: "normal", label: "Normal", dot: "bg-blue" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.priority === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/task-id");
              if (id) updateTask(id, { priority: col.key });
            }}
            className="rounded-xl bg-neutral-50 p-3"
          >
            <div className="flex items-center gap-2 px-1 pb-2">
              <span className={cn("h-2 w-2 rounded-full", col.dot)} />
              <p className="text-sm font-semibold text-ink">{col.label}</p>
              <span className="text-xs text-neutral-400">{colTasks.length}</span>
            </div>
            <div className="space-y-2">
              {colTasks.map((t) => (
                <div
                  key={t.id}
                  draggable={!t.external}
                  onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
                  onClick={() => openEdit(t)}
                  className={cn("rounded-lg border border-neutral-100 bg-white p-3", t.external ? "cursor-pointer" : "cursor-grab active:cursor-grabbing")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm text-ink", t.done && "text-neutral-400 line-through")}>{t.title}</p>
                    {isOverdue(t) && <Badge accent="red" className="shrink-0">Overdue</Badge>}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                    <span>{t.external ? providerLabel(t.external.provider) : projectName(t.projectId) ?? "—"}</span>
                    <span>{formatDueDate(t.dueDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineView({
  tasks,
  projectName,
  openEdit,
}: {
  tasks: Task[];
  projectName: (id?: string) => string | undefined;
  openEdit: (t: Task) => void;
}) {
  const byProject = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = projectName(t.projectId) ?? "No project";
    byProject.set(key, [...(byProject.get(key) ?? []), t]);
  }

  return (
    <div className="space-y-5">
      {Array.from(byProject.entries()).map(([name, list]) => (
        <div key={name} className="rounded-xl border border-neutral-100 bg-white p-4">
          <p className="text-sm font-semibold text-ink">{name}</p>
          <div className="mt-3 space-y-2">
            {list.map((t) => (
              <button key={t.id} onClick={() => openEdit(t)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-50">
                <PriorityDot priority={t.priority} />
                <span className={cn("flex-1 text-sm text-ink", t.done && "text-neutral-400 line-through")}>{t.title}</span>
                {isOverdue(t) && <Badge accent="red">Overdue</Badge>}
                <div className="h-1.5 flex-1 max-w-40 overflow-hidden rounded-full bg-neutral-100">
                  <div className={cn("h-full rounded-full", t.done ? "bg-neutral-300 w-full" : "bg-blue w-2/3")} />
                </div>
                <span className="w-32 shrink-0 text-right text-xs text-neutral-400">{formatDueDate(t.dueDate) ?? "No date"}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ tasks, openEdit }: { tasks: Task[]; openEdit: (t: Task) => void }) {
  const buckets: Record<string, Task[]> = { Today: [], Tomorrow: [], "This week": [], Later: [] };
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date());
  const tomorrow = today + 86_400_000;
  const weekEnd = today + 7 * 86_400_000;

  for (const t of tasks) {
    if (!t.dueDate) {
      buckets.Later.push(t);
      continue;
    }
    const due = startOfDay(new Date(t.dueDate));
    if (Number.isNaN(due)) buckets.Later.push(t);
    else if (due <= today) buckets.Today.push(t);
    else if (due === tomorrow) buckets.Tomorrow.push(t);
    else if (due <= weekEnd) buckets["This week"].push(t);
    else buckets.Later.push(t);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {Object.entries(buckets).map(([label, list]) => (
        <div key={label} className="rounded-xl bg-neutral-50 p-3">
          <p className="px-1 pb-2 text-sm font-semibold text-ink">{label}</p>
          <div className="space-y-2">
            {list.map((t) => (
              <button key={t.id} onClick={() => openEdit(t)} className="w-full rounded-lg border border-neutral-100 bg-white p-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PriorityDot priority={t.priority} />
                    <p className={cn("text-sm text-ink", t.done && "text-neutral-400 line-through")}>{t.title}</p>
                  </div>
                  {isOverdue(t) && <Badge accent="red" className="shrink-0">Overdue</Badge>}
                </div>
              </button>
            ))}
            {list.length === 0 && <p className="px-1 text-xs text-neutral-400">Nothing here.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
