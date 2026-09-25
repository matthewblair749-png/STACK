"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, ArrowRight, Zap, Sparkles, Search, PlusSquare, Bell, RefreshCcw } from "lucide-react";
import { automations as initialAutomations } from "@/lib/demo-data";
import type { AutomationStep } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const stepIcon: Record<AutomationStep["kind"], typeof Zap> = {
  trigger: Zap,
  ai: Sparkles,
  find: Search,
  action: PlusSquare,
  notify: Bell,
};

const stepColor: Record<AutomationStep["kind"], string> = {
  trigger: "bg-yellow-soft text-neutral-900",
  ai: "bg-blue-soft text-blue",
  find: "bg-neutral-100 text-neutral-700",
  action: "bg-blue-soft text-blue",
  notify: "bg-red-soft text-red",
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState(initialAutomations);

  function toggle(id: string) {
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <p role="note" className="mb-5 rounded-xl border border-yellow/40 bg-yellow-soft px-4 py-3 text-sm text-neutral-700">
        <span className="font-semibold text-ink">Preview.</span> These are examples of what automations will look like. STACK doesn&apos;t run automations yet, and nothing below is connected to your apps.
      </p>
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">Let STACK handle the busywork.</p>
        <Button size="sm"><Plus size={14} /> New automation</Button>
      </div>

      <div className="mt-6 space-y-4">
        {automations.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }}>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{a.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                    <RefreshCcw size={11} /> Ran {a.runs} times
                  </p>
                </div>
                <button
                  onClick={() => toggle(a.id)}
                  className={cn("h-6 w-11 rounded-full transition-colors", a.enabled ? "bg-blue" : "bg-neutral-200")}
                >
                  <motion.span
                    className="block h-5 w-5 rounded-full bg-white shadow"
                    animate={{ x: a.enabled ? 22 : 2 }}
                    transition={{ duration: 0.15 }}
                  />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 overflow-x-auto">
                {a.steps.map((step, idx) => {
                  const Icon = stepIcon[step.kind];
                  return (
                    <div key={step.id} className="flex items-center">
                      <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2", stepColor[step.kind])}>
                        <Icon size={14} />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{step.label}</p>
                          <p className="text-xs font-medium">{step.detail}</p>
                        </div>
                      </div>
                      {idx < a.steps.length - 1 && <ArrowRight size={14} className="mx-1.5 shrink-0 text-neutral-300" />}
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="mt-6 border-dashed">
        <p className="text-sm font-semibold text-ink">Build your own</p>
        <p className="mt-1 text-sm text-neutral-500">
          Combine a trigger (new email, new message, meeting ends, task completed, new file, deadline
          approaching, new project) with actions (create task, send message, create summary, update
          project, assign task, send notification, generate report).
        </p>
        <Button variant="outline" size="sm" className="mt-4"><Plus size={14} /> Start building</Button>
      </Card>
    </div>
  );
}
