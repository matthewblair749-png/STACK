"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo-context";
import type { Priority, Subtask, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

function toDatetimeLocal(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: "normal", label: "Normal", color: "bg-blue" },
  { value: "important", label: "Important", color: "bg-yellow" },
  { value: "urgent", label: "Urgent", color: "bg-red" },
];

export function TaskModal({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: () => void;
  initial?: Task | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={onClose}
        >
          <TaskModalForm
            key={initial?.id ?? "new"}
            initial={initial}
            onSave={onSave}
            onClose={onClose}
            onDelete={onDelete}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TaskModalForm({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: Task | null;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: () => void;
}) {
  const { projects, people } = useDemo();
  const { data: session } = useSession();
  const subtaskId = useRef(0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "normal");
  const [projectId, setProjectId] = useState<string>(initial?.projectId ?? "");
  const [assigneeId, setAssigneeId] = useState<string>(initial?.assigneeId ?? session?.user?.id ?? "");
  const [dueDate, setDueDate] = useState(toDatetimeLocal(initial?.dueDate));
  const [labelsInput, setLabelsInput] = useState(initial?.labels.join(", ") ?? "");
  const [subtasks, setSubtasks] = useState<Subtask[]>(initial?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState("");
  const [blocked, setBlocked] = useState(initial?.status === "Blocked");
  const [blockedReason, setBlockedReason] = useState(initial?.blockedReason ?? "");
  const [waitingOnId, setWaitingOnId] = useState(initial?.waitingOnId ?? "");

  function addSubtask() {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { id: `new-st${subtaskId.current++}`, title: newSubtask.trim(), done: false }]);
    setNewSubtask("");
  }

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      id: initial?.id ?? `new-t${subtaskId.current++}`,
      title: title.trim(),
      description: description.trim() || undefined,
      done: initial?.done ?? false,
      priority,
      projectId: projectId || undefined,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      labels: labelsInput.split(",").map((l) => l.trim()).filter(Boolean),
      subtasks,
      source: initial?.source ?? "stack",
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      status: initial?.done ? "Done" : blocked ? "Blocked" : initial?.status === "InProgress" ? "InProgress" : "Todo",
      blockedReason: blocked ? blockedReason.trim() || undefined : undefined,
      waitingOnId: waitingOnId || (initial?.waitingOnId ? null : undefined),
    });
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => e.stopPropagation()}
      className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{initial ? "Edit task" : "New task"}</h2>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100"><X size={18} /></button>
      </div>

      <div className="mt-5 space-y-4">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-ink"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={2}
          className="w-full resize-none rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-ink"
        />

        <div>
          <p className="mb-1.5 text-xs font-medium text-neutral-500">Priority</p>
          <div className="flex gap-2">
            {priorities.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
                  priority === p.value ? "border-ink bg-neutral-50" : "border-neutral-200 text-neutral-500",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", p.color)} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-500">Project</p>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-ink"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-500">Assignee</p>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-ink"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-500">Due date</p>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-500">Labels</p>
            <input
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              placeholder="design, copy"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </div>
        </div>

        {initial && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-neutral-500">
                <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} /> Blocked
              </label>
              <input
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                disabled={!blocked}
                placeholder="What's blocking it?"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-ink disabled:bg-neutral-50"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-neutral-500">Waiting on</p>
              <select
                value={waitingOnId}
                onChange={(e) => setWaitingOnId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-ink"
              >
                <option value="">No one</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div>
          <p className="mb-1.5 text-xs font-medium text-neutral-500">Subtasks</p>
          <div className="space-y-1.5">
            {subtasks.map((st) => (
              <div key={st.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={st.done}
                  onChange={() =>
                    setSubtasks((prev) => prev.map((s) => (s.id === st.id ? { ...s, done: !s.done } : s)))
                  }
                />
                <span className={cn("flex-1 text-sm", st.done && "text-neutral-400 line-through")}>{st.title}</span>
                <button onClick={() => setSubtasks((prev) => prev.filter((s) => s.id !== st.id))}>
                  <Trash2 size={14} className="text-neutral-300 hover:text-red" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSubtask();
              }}
              placeholder="Add subtask and press Enter"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-ink"
            />
            <button
              onClick={addSubtask}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 text-sm text-neutral-500 hover:bg-neutral-50"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        {initial && onDelete ? (
          <button onClick={onDelete} className="text-sm font-medium text-red hover:underline">Delete task</button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{initial ? "Save changes" : "Create task"}</Button>
        </div>
      </div>
    </motion.div>
  );
}
