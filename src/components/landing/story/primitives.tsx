"use client";

import { motion } from "framer-motion";
import { IntegrationLogo } from "@/components/brand-icons";
import { cn } from "@/lib/utils";

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({ children, delay = 0, className, y = 18 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** The "8:48 AM · Understand" marker that opens each chapter of the day. */
export function ChapterMark({ time, stage, tone = "light" }: { time: string; stage?: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className={cn("flex items-center gap-3 font-mono text-[13px] tracking-wide", dark ? "text-[#a8a4b4]" : "text-neutral-500")}>
      <span className={cn("h-2 w-2 rounded-full", dark ? "bg-[#ff7a5c]" : "bg-[#e8a400]")} />
      <span className={dark ? "text-[#f4f2f8]" : "text-ink"}>{time}</span>
      {stage && (
        <>
          <span aria-hidden className={cn("h-px w-6", dark ? "bg-[#3a3744]" : "bg-neutral-300")} />
          <span className="uppercase">{stage}</span>
        </>
      )}
    </div>
  );
}

/** A product window: soft frame, title bar and a quiet "example" tag so the sample data is never mistaken for real. */
export function AppWindow({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "clay overflow-hidden bg-white shadow-[0_30px_60px_-30px_rgba(40,32,20,0.28),0_8px_20px_-12px_rgba(40,32,20,0.12)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-25/60 px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f2c4bd]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f3dfae]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#c9e3c4]" />
        <span className="ml-3 text-xs font-medium text-neutral-500">{title}</span>
        <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Example</span>
      </div>
      {children}
    </div>
  );
}

/** "Gmail · Slack" - where a sentence came from. */
export function Sources({ apps }: { apps: { id: string; name: string }[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {apps.map((a) => (
        <span key={a.id} className="clay-pill inline-flex items-center gap-1 bg-neutral-25 py-0.5 pl-1 pr-2 text-[11px] font-medium text-neutral-500">
          <IntegrationLogo app={a.id} name={a.name} size="sm" />
          {a.name}
        </span>
      ))}
    </span>
  );
}
