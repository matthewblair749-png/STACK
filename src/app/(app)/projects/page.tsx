"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, X } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/sparkline";
import { KpiTile } from "@/components/app/kpi-tile";
import { getProjectStatusCounts } from "@/lib/dashboard-metrics";

const statusAccent = { "on-track": "green", "at-risk": "yellow", behind: "red" } as const;
const statusLabel = { "on-track": "On track", "at-risk": "At risk", behind: "Behind" } as const;
const barColor = { blue: "bg-blue", yellow: "bg-yellow", red: "bg-red" } as const;

export default function ProjectsPage() {
  const { projects, people, addProject } = useDemo();
  const { onTrack, atRisk, behind } = getProjectStatusCounts(projects);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Total Projects" value={projects.length} trend="Active" trendAccent="neutral" />
        <KpiTile label="On Track" value={onTrack} trend="Healthy" trendAccent="green" />
        <KpiTile label="At Risk" value={atRisk} trend={atRisk > 0 ? "Watch" : "None"} trendAccent={atRisk > 0 ? "yellow" : "green"} />
        <KpiTile label="Behind" value={behind} trend={behind > 0 ? "Needs attention" : "None"} trendAccent={behind > 0 ? "red" : "green"} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-neutral-500">{projects.length} projects</p>
        <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={14} /> New project</Button>
      </div>

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={addProject} />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {projects.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
            <Link href={`/projects/${p.id}`}>
              <Card hover className="rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-semibold text-ink">{p.name}</p>
                    <p className="mt-1 text-sm text-neutral-500">{p.description}</p>
                  </div>
                  <Badge accent={statusAccent[p.status]}>{statusLabel[p.status]}</Badge>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div className={`h-full rounded-full ${barColor[p.color]}`} style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-xs font-medium text-neutral-500">{p.progress}%</span>
                  {p.progressHistory && <Sparkline data={p.progressHistory} width={44} height={18} className="text-neutral-300" />}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {p.memberIds.map((id) => {
                      const person = people.find((pp) => pp.id === id);
                      if (!person) return null;
                      return (
                        <div key={id} title={person.name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-[10px] font-semibold text-neutral-600">
                          {person.initials}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-neutral-400">
                    {p.completedCount}/{p.taskCount} tasks
                    {p.dueDate && ` · Due ${new Date(p.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                  </p>
                </div>

                {p.aiSummary && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-soft p-3">
                    <Sparkles size={13} className="mt-0.5 shrink-0 text-blue" />
                    <p className="text-xs text-neutral-700">{p.aiSummary}</p>
                  </div>
                )}
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NewProjectModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; description?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim() || undefined });
    setName("");
    setDescription("");
    onClose();
  }

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
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">New project</h2>
              <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-ink"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={2}
                className="w-full resize-none rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-ink"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Create project</Button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
