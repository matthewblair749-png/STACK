"use client";

import { motion } from "framer-motion";
import {
  Home, CheckSquare, FolderKanban, Inbox, Calendar, Sparkles, Plug,
  Circle, CheckCircle2, Video, AlertCircle, Search,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { SectionHeader } from "./section-header";

const sidebarItems = [
  { label: "Home", icon: Home, active: true },
  { label: "My Tasks", icon: CheckSquare },
  { label: "Projects", icon: FolderKanban },
  { label: "Inbox", icon: Inbox },
  { label: "Calendar", icon: Calendar },
  { label: "AI", icon: Sparkles },
  { label: "Integrations", icon: Plug },
];

const projects = [
  { name: "Marketing Launch", progress: 72, color: "bg-blue" },
  { name: "Mobile App Redesign", progress: 41, color: "bg-yellow" },
  { name: "Q4 Sales Enablement", progress: 88, color: "bg-blue" },
];

export function ProductShowcase() {
  return (
    <section id="product" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <SectionHeader
        eyebrow="See it in action"
        title="Open STACK. Understand your day."
        subtitle="One command center for tasks, meetings, messages, and projects — with an AI brief that tells you exactly what needs you next."
        className="max-w-2xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="mx-auto mt-16 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-[0_60px_140px_-60px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow" />
          <span className="h-2.5 w-2.5 rounded-full bg-blue" />
          <div className="mx-auto flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-1 text-xs text-neutral-400">
            <Search size={12} /> stackunder.website/home
          </div>
        </div>

        <div className="flex">
          <div className="hidden w-56 shrink-0 flex-col gap-1 border-r border-neutral-100 p-4 md:flex">
            <div className="mb-5 px-1"><Logo size={22} textClassName="text-base" /></div>
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${item.active ? "bg-neutral-100 font-medium text-ink" : "text-neutral-500"}`}
                >
                  <Icon size={16} />
                  {item.label}
                </div>
              );
            })}
          </div>

          <div className="flex-1 p-6 sm:p-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold text-ink">Good morning 👋</p>
                <p className="mt-1 text-neutral-500">Here&apos;s what needs your attention.</p>
              </div>
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-soft text-sm font-semibold text-blue sm:flex">M</div>
            </div>

            <div className="mt-6 rounded-2xl bg-blue-soft p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue">
                <Sparkles size={13} /> AI Brief
              </p>
              <p className="mt-2 text-sm text-neutral-700 sm:text-base">
                You have 3 meetings today, 5 priority tasks, and 2 project
                updates that need your attention.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-100 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Priority Tasks</p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm"><Circle size={14} className="text-red" /> Finish product proposal</div>
                  <div className="flex items-center gap-2 text-sm"><Circle size={14} className="text-yellow" /> Review marketing designs</div>
                  <div className="flex items-center gap-2 text-sm"><Circle size={14} className="text-red" /> Prepare for 2 PM meeting</div>
                  <div className="flex items-center gap-2 text-sm text-neutral-400 line-through"><CheckCircle2 size={14} className="text-blue" /> Sync design tokens</div>
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-100 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Today&apos;s Meetings</p>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center gap-2"><Video size={14} className="text-blue" /> 2:00 PM · Launch sync</div>
                  <div className="flex items-center gap-2"><Video size={14} className="text-blue" /> 3:30 PM · 1:1 with Marcus</div>
                  <div className="flex items-center gap-2 text-neutral-400"><AlertCircle size={14} className="text-red" /> 4:15 PM · Redesign review</div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-neutral-100 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Active Projects</p>
              <div className="mt-3 space-y-3">
                {projects.map((p) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{p.name}</span>
                      <span className="text-neutral-400">{p.progress}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div className={`h-full rounded-full ${p.color}`} style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
