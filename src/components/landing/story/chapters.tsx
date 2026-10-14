"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { ChapterMark, Reveal } from "./primitives";

const ease = [0.22, 1, 0.36, 1] as const;
const inView = { once: true, margin: "-80px" } as const;

/* ------------------------------------------------------------------ 8:47 - the morning without STACK */

const noise = [
  { app: "gmail", name: "Gmail", text: "Re: Re: Q4 proposal - any update?", meta: "Sarah Chen" },
  { app: "slack", name: "Slack", text: "@alex did you see my message?", meta: "#acme-account" },
  { app: "google-calendar", name: "Calendar", text: "Design review moved to 10:00", meta: "Updated" },
  { app: "github", name: "GitHub", text: "Build failing on main", meta: "ci / test" },
  { app: "linear", name: "Linear", text: "3 issues assigned to you", meta: "Launch" },
  { app: "gmail", name: "Gmail", text: "Your weekly digest", meta: "Newsletter" },
  { app: "notion", name: "Notion", text: "Launch plan was edited", meta: "4 changes" },
  { app: "slack", name: "Slack", text: "quick q when you have a sec", meta: "Dev" },
  { app: "asana", name: "Asana", text: "Task due tomorrow", meta: "Mobile redesign" },
  { app: "zoom", name: "Zoom", text: "Recording available", meta: "Yesterday's sync" },
];

export function MorningChapter() {
  return (
    <section id="story" className="relative scroll-mt-20 overflow-hidden px-6 py-24 sm:py-32">
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <ChapterMark time="8:47 AM" />
          <h2 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[3.4rem]">
            You haven&apos;t started yet.
            <br />
            <span className="text-neutral-400">You&apos;re already behind.</span>
          </h2>
          <div className="mt-7 max-w-lg space-y-4 text-lg leading-relaxed text-neutral-500">
            <p>Twenty-three emails. Fourteen Slack threads. A meeting that moved. A board that changed overnight.</p>
            <p>
              Somewhere in that pile is the one thing that actually matters today, and finding it is your job before you&apos;ve
              done any work at all.
            </p>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-neutral-200 pt-8">
            {[
              ["47", "unread"],
              ["6", "apps open"],
              ["1", "thing that matters"],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="text-3xl font-semibold tracking-tight text-ink">{n}</dd>
                <dd className="mt-1 text-sm text-neutral-500">{l}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* A messy desk: notifications land like slips of paper, each at its own careless angle. */}
        <div aria-hidden className="relative h-[500px] [--slip-w:250px] sm:h-[540px] sm:[--slip-w:300px]">
          {noise.map((n, i) => {
            const rot = [-7, 5, -3, 8, -10, 4, -5, 9, -2, 6][i];
            const spread = [0.1, 0.78, 0.26, 1, 0, 0.62, 0.36, 0.88, 0.16, 0.52][i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -40, rotate: rot * 2 }}
                whileInView={{ opacity: 1, y: 0, rotate: rot }}
                viewport={inView}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.11, ease }}
                className="clay-sm absolute flex w-[var(--slip-w)] items-center gap-3 bg-white p-3.5 shadow-[0_16px_24px_-16px_rgba(0,0,0,0.35),0_1px_2px_rgba(0,0,0,0.06)] sm:w-[300px]"
                style={{ top: i * 46, left: `calc((100% - var(--slip-w)) * ${spread * 0.94} + 6px)` }}
              >
                <IntegrationLogo app={n.app} name={n.name} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{n.text}</span>
                  <span className="block truncate text-xs text-neutral-500">
                    {n.name} · {n.meta}
                  </span>
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Reveal className="relative mx-auto mt-16 max-w-6xl" delay={0.1}>
        <p className="flex items-center gap-3 text-lg font-medium text-ink">
          <ArrowRight size={18} className="text-blue" /> Now, the same morning with STACK.
        </p>
      </Reveal>
    </section>
  );
}
