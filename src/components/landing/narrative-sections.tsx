"use client";

import { motion } from "framer-motion";
import {
  CheckSquare, FolderKanban, MessageSquare, Files,
  Mail, Calendar, HardDrive, Video, GitBranch, ArrowRight,
  Sparkles, CheckCircle2, Circle,
} from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { SectionHeader } from "./section-header";
import { cn } from "@/lib/utils";

function Visual({ children, delay = 0.1 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay }}
      className="mx-auto mt-20 flex max-w-4xl items-center justify-center"
    >
      {children}
    </motion.div>
  );
}

export function WorkspaceSection() {
  const items = [
    { icon: CheckSquare, label: "Tasks", desc: "Priorities, due dates, subtasks", accent: "blue" as const },
    { icon: FolderKanban, label: "Projects", desc: "Progress, timelines, AI summaries", accent: "yellow" as const },
    { icon: MessageSquare, label: "Messages", desc: "Slack and email in one feed", accent: "red" as const },
    { icon: Files, label: "Files", desc: "Search across every connected drive", accent: "blue" as const },
  ];
  const accentBg = { blue: "bg-blue-soft text-blue", yellow: "bg-yellow-soft text-neutral-900", red: "bg-red-soft text-red" };

  return (
    <section className="bg-neutral-50 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="The product"
          title="One workspace for every kind of work."
          subtitle="Tasks, projects, conversations, and files — organized the same way, searchable the same way, understood by the same AI."
          className="max-w-2xl"
        />
        <Visual>
          <div className="grid w-full grid-cols-2 gap-5 sm:grid-cols-4">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="flex flex-col items-center gap-3.5 rounded-3xl border border-neutral-100 bg-white px-5 py-10 text-center"
                >
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", accentBg[item.accent])}>
                    <Icon size={24} />
                  </div>
                  <span className="text-base font-semibold text-ink">{item.label}</span>
                  <span className="text-xs text-neutral-400">{item.desc}</span>
                </motion.div>
              );
            })}
          </div>
        </Visual>
      </div>
    </section>
  );
}

export function ConnectsSection() {
  const icons = [Mail, MessageSquare, Calendar, HardDrive, Video, GitBranch];
  return (
    <section id="solutions" className="bg-white py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="How it works"
          title="Your apps do the work. STACK connects it."
          subtitle="STACK isn't another inbox or another task list. It sits above the tools you already use and makes sense of what's happening across all of them."
          className="max-w-2xl"
        />
        <Visual>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {icons.map((Icon, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-100 bg-white shadow-[0_12px_28px_-16px_rgba(0,0,0,0.25)] sm:h-20 sm:w-20"
              >
                <Icon size={26} className="text-neutral-500" />
              </motion.div>
            ))}
            <ArrowRight size={26} className="mx-2 text-neutral-300" />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="flex items-center justify-center"
            >
              <LogoIcon size={72} animate={false} />
            </motion.div>
          </div>
        </Visual>
      </div>
    </section>
  );
}

export function SurfacesSection() {
  return (
    <section className="bg-neutral-50 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Everywhere you work"
          title="Every screen, nothing to install."
          subtitle="STACK runs in your browser and adapts to any screen - pick up a task on your phone, finish it at your desk. Same account, same data."
          className="max-w-2xl"
        />
        <Visual>
          <div className="flex w-full flex-col items-center gap-10 sm:flex-row sm:items-end sm:justify-center sm:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-44 w-72 flex-col gap-2 rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_20px_44px_-20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red" />
                  <span className="h-2 w-2 rounded-full bg-yellow" />
                  <span className="h-2 w-2 rounded-full bg-blue" />
                </div>
                <div className="mt-1 h-3 w-2/3 rounded bg-neutral-100" />
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <div className="rounded-lg bg-blue-soft" />
                  <div className="rounded-lg bg-neutral-50" />
                </div>
              </div>
              <span className="text-sm text-neutral-500">Desktop browser</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-40 w-32 flex-col gap-2 rounded-2xl border border-neutral-100 bg-white p-3 shadow-[0_18px_38px_-18px_rgba(0,0,0,0.28)]">
                <div className="h-2.5 w-1/2 rounded bg-neutral-100" />
                <div className="flex-1 rounded-lg bg-yellow-soft" />
                <div className="h-8 rounded-lg bg-neutral-50" />
              </div>
              <span className="text-sm text-neutral-500">Tablet</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-40 w-20 flex-col gap-2 rounded-2xl border border-neutral-100 bg-white p-2.5 shadow-[0_18px_38px_-18px_rgba(0,0,0,0.28)]">
                <div className="h-2 w-1/2 rounded bg-neutral-100" />
                <div className="flex-1 rounded-lg bg-red-soft" />
                <div className="h-2 rounded bg-neutral-50" />
              </div>
              <span className="text-sm text-neutral-500">Phone</span>
            </motion.div>
          </div>
        </Visual>
      </div>
    </section>
  );
}

export function AskAISection() {
  return (
    <section className="bg-white py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="STACK AI"
          title="Ask anything about your work."
          subtitle="STACK AI combines your tasks, files, messages, and meetings to answer in seconds — and always shows where the answer came from."
          className="max-w-2xl"
        />
        <Visual>
          <div className="w-full max-w-xl space-y-4 rounded-3xl border border-neutral-100 bg-white p-6 text-left shadow-[0_30px_70px_-30px_rgba(0,0,0,0.3)] sm:p-8">
            <div className="flex justify-end">
              <div className="rounded-2xl bg-ink px-4 py-2.5 text-sm text-white">
                Which projects are behind schedule?
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-blue">
                <Sparkles size={14} />
              </div>
              <div>
                <p className="text-sm text-ink sm:text-base">
                  Customer Onboarding Revamp is behind schedule — no updates in
                  6 days and 4 tasks are overdue.
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
                  <CheckCircle2 size={12} className="text-blue" /> Sources: Notion, Asana, 2 emails
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="rounded-2xl bg-ink px-4 py-2.5 text-sm text-white">
                Turn this into a task and assign it to Alex.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-blue">
                <Sparkles size={14} />
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                <p className="flex items-center gap-2"><Circle size={13} className="text-red" /> Task &ldquo;Unblock onboarding timeline&rdquo; for Alex Rivera</p>
                <p className="mt-1.5 text-xs text-neutral-400">Waiting for your approval - Approve · Edit · Cancel</p>
              </div>
            </div>
          </div>
        </Visual>
      </div>
    </section>
  );
}

export function AutomationSection() {
  const steps = [
    { label: "When", detail: "Meeting ends" },
    { label: "STACK AI", detail: "Summarize" },
    { label: "Find", detail: "Action items" },
    { label: "Create", detail: "Tasks" },
    { label: "Update", detail: "Project" },
    { label: "Notify", detail: "Team" },
  ];
  return (
    <section className="bg-yellow-soft py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Automations · Coming soon"
          accent="yellow"
          title="Next: let STACK handle the busywork."
          subtitle="Visual workflows that trigger on emails, messages, meetings or deadlines are in the works. Today, STACK drafts tasks and replies for you to approve in one click."
          className="max-w-2xl"
        />
        <Visual>
          <div className="flex w-full flex-wrap items-center justify-center gap-2.5 sm:gap-0">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-center shadow-[0_12px_28px_-16px_rgba(0,0,0,0.2)]"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{step.label}</span>
                  <span className="text-sm font-medium text-ink">{step.detail}</span>
                </motion.div>
                {i < steps.length - 1 && <ArrowRight size={18} className="mx-1.5 shrink-0 text-neutral-400 sm:mx-2" />}
              </div>
            ))}
          </div>
        </Visual>
      </div>
    </section>
  );
}
