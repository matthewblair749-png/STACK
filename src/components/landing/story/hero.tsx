"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowDown, Check, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { AppWindow, Sources } from "./primitives";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } });

const chips = ["3 priorities", "2 meetings", "1 project at risk", "4 people waiting on you"];

export function StoryHero() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 sm:pt-28">
      {/* A soft morning glow behind the headline. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[520px] max-w-4xl rounded-full bg-[radial-gradient(closest-side,rgba(47,94,255,0.10),transparent)]" />

      <div className="relative mx-auto max-w-4xl text-center">
        <motion.p {...rise(0)} className="text-sm font-medium text-neutral-500">
          All your work, together.
        </motion.p>
        <motion.h1 {...rise(0.06)} className="mt-5 text-[3.25rem] font-semibold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[5.5rem]">
          Know what
          <br />
          needs you.
        </motion.h1>
        <motion.p {...rise(0.14)} className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-neutral-500 sm:text-xl">
          STACK reads your email, chat, calendar, tasks and files, then shows you on one calm page what matters today, why it
          matters, and what to do next.
        </motion.p>
        <motion.div {...rise(0.22)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className={buttonClasses({ size: "lg", className: "group" })}>
            Get started free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="#story" className={buttonClasses({ size: "lg", variant: "outline", className: "group" })}>
            Follow one morning
            <ArrowDown size={16} className="transition-transform group-hover:translate-y-0.5" />
          </Link>
        </motion.div>
        <motion.p {...rise(0.3)} className="mt-6 text-sm text-neutral-500">
          Free during early access · Read-only by default · Nothing sent without your OK
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.35, ease }}
        className="relative mx-auto mt-16 max-w-5xl sm:mt-20"
      >
        <AppWindow title="STACK · Home">
          <div className="grid gap-0 md:grid-cols-[1.5fr_1fr]">
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Good morning, Alex.</p>
                  <p className="mt-1 text-neutral-500">Here&apos;s what matters right now.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1 text-xs font-medium text-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-green" /> Up to date
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {chips.map((c, i) => (
                  <motion.span
                    key={c}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.0 + i * 0.08, ease }}
                    className="rounded-full border border-neutral-200 px-3 py-1.5 text-[13px] font-medium text-neutral-700"
                  >
                    {c}
                  </motion.span>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.35, ease }}
                className="mt-7 rounded-2xl border border-neutral-200 p-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue">Most important</p>
                <p className="mt-2 text-lg font-semibold leading-snug text-ink">Send Sarah the Q4 proposal</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-500">
                  She&apos;s asked twice, once by email and once in Slack, and needs it by tomorrow.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Sources apps={[{ id: "gmail", name: "Gmail" }, { id: "slack", name: "Slack" }]} />
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper">
                    <Sparkles size={13} /> Draft reply
                  </span>
                </div>
              </motion.div>
            </div>

            <div className="border-t border-neutral-100 bg-neutral-25 p-6 sm:p-8 md:border-l md:border-t-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Today</p>
              <ul className="mt-4 space-y-4">
                {[
                  { t: "10:00", what: "Design review", note: "Moved from Tuesday" },
                  { t: "2:00", what: "Launch sync", note: "You're presenting" },
                ].map((m, i) => (
                  <motion.li key={m.what} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 1.5 + i * 0.1, ease }} className="flex gap-3">
                    <span className="w-11 shrink-0 font-mono text-[13px] text-neutral-500">{m.t}</span>
                    <span>
                      <span className="block text-sm font-medium text-ink">{m.what}</span>
                      <span className="block text-xs text-neutral-500">{m.note}</span>
                    </span>
                  </motion.li>
                ))}
              </ul>
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Can wait</p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.8 }} className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
                <Check size={15} className="text-green" /> 19 newsletters, 6 FYI threads
              </motion.p>
            </div>
          </div>
        </AppWindow>
      </motion.div>
    </section>
  );
}
