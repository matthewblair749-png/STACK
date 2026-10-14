"use client";

import { motion } from "framer-motion";
import { IntegrationLogo } from "@/components/brand-icons";
import { Nebula } from "./space";
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
export function ChapterMark({ time, stage, dark = false }: { time: string; stage?: string; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[13px] tracking-wide text-neutral-500">
      <span className={cn("h-2 w-2 rounded-full", dark ? "bg-yellow shadow-[0_0_12px_var(--color-yellow)]" : "bg-blue shadow-[0_0_12px_var(--color-blue)]")} />
      <span className="text-ink">{time}</span>
      {stage && (
        <>
          <span aria-hidden className="h-px w-6 bg-neutral-300" />
          <span className="uppercase">{stage}</span>
        </>
      )}
    </div>
  );
}

/** A chapter: text on one side, the product moment on the other. */
export function Chapter({
  id,
  mark,
  title,
  body,
  visual,
  flip = false,
}: {
  id?: string;
  mark: React.ReactNode;
  title: React.ReactNode;
  body: React.ReactNode;
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-24 px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        <Reveal className={cn("max-w-xl", flip && "lg:order-2")}>
          {mark}
          <h2 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">{title}</h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-neutral-500">{body}</div>
        </Reveal>
        <div className={cn("relative min-w-0", flip && "lg:order-1")}>
          <Nebula className="-inset-16" color={flip ? "90,140,255" : "150,110,255"} opacity={0.2} />
          <div className="relative">{visual}</div>
        </div>
      </div>
    </section>
  );
}

/** A product window: soft frame, title bar and a quiet "example" tag so the sample data is never mistaken for real. */
export function AppWindow({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[22px] border border-[rgba(255,255,255,0.09)] bg-[rgba(17,16,27,0.82)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_50px_120px_-40px_rgba(110,90,255,0.5)] backdrop-blur-xl", className)}>
      <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
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
        <span key={a.id} className="inline-flex items-center gap-1 rounded-full border border-neutral-100 bg-neutral-25 py-0.5 pl-1 pr-2 text-[11px] font-medium text-neutral-500">
          <IntegrationLogo app={a.id} name={a.name} size="sm" />
          {a.name}
        </span>
      ))}
    </span>
  );
}
