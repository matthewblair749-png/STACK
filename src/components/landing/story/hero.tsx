"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowDown, Check, Sparkles } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { LogoMark } from "@/components/logo";
import { Sources } from "./primitives";
import { Coffee, DeskClock, Highlighter } from "./desk";
import { Laptop } from "./laptop";
import { ClayShapes } from "./clay-shapes";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } });

/** One sheet per app, as they land on the desk (scattered) and where they end up (stacked, headers peeking out). */
const SHEETS = [
  { app: "gmail", name: "Gmail", line: "23 new · Re: Q4 proposal", sx: -150, sy: -40, sr: -16 },
  { app: "slack", name: "Slack", line: "14 threads · #acme-account", sx: 140, sy: -70, sr: 12 },
  { app: "google-calendar", name: "Calendar", line: "Design review moved to 10:00", sx: -190, sy: 90, sr: 9 },
  { app: "github", name: "GitHub", line: "Build failing on main", sx: 170, sy: 70, sr: -11 },
  { app: "linear", name: "Linear", line: "3 issues assigned to you", sx: -40, sy: 150, sr: 6 },
  { app: "notion", name: "Notion", line: "Launch plan edited", sx: 60, sy: -130, sr: -7 },
];
const PEEK = 30; // how much of each sheet's header shows above the next one
const BRIEF_TOP = SHEETS.length * PEEK;

/** "email", "meetings", "tasks"... then "work": what STACK reads, ending on the whole of it. */
const WORDS = ["email", "meetings", "tasks", "files", "chats", "work"];

function RotatingWord() {
  const still = useReducedMotion();
  const [i, setI] = useState(WORDS.length - 1);
  useEffect(() => {
    if (still) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % WORDS.length), 2000);
    return () => window.clearInterval(id);
  }, [still]);
  // One word at a time: a new key swaps the element, and it rises in with a short CSS animation.
  return (
    <span key={WORDS[i]} className="inline-block [animation:word-in_0.45s_cubic-bezier(0.22,1,0.36,1)]">
      {WORDS[i]}
    </span>
  );
}

export function StoryHero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-14 sm:pt-20 lg:pb-28 xl:pb-[580px]">
      {/* Light on the desk. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_65%_at_62%_40%,#fbfaf7_0%,rgba(251,250,247,0)_70%)]" />

      {/* STACK's desk: the 08:47 clock, the laptop with STACK open, coffee, the highlighter and a few clay shapes. Wide screens only. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3, ease }} className="absolute inset-0">
          <DeskClock className="right-[3%] top-[24px] origin-top-right scale-[0.78]" />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.4, ease }} className="absolute inset-0">
          <Laptop className="bottom-[56px] right-[3%] origin-bottom-right rotate-[-2deg] scale-[0.72]" />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.5, ease }} className="absolute inset-0">
          <Coffee className="bottom-[150px] left-[5%]" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.7, ease }} className="absolute inset-0">
          <Highlighter className="bottom-[120px] left-[24%] rotate-[-9deg]" />
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 0.9, ease }} className="absolute inset-0">
          <ClayShapes />
        </motion.div>
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div>
          <motion.p {...rise(0)} className="flex items-center gap-2.5 font-mono text-[13px] text-neutral-500">
            <span className="h-2 w-2 rounded-full bg-[#e8a400]" />
            <span className="text-ink">8:47 AM</span> · Tuesday
          </motion.p>
          <motion.h1 {...rise(0.06)} className="mt-6 text-balance text-[3rem] font-semibold leading-[1.0] tracking-[-0.04em] text-ink sm:text-[4.25rem] lg:text-[4.6rem]">
            <span className="sr-only">All your work, in one neat stack.</span>
            <span aria-hidden>
              All your <RotatingWord />, in one <span className="highlight">neat stack.</span>
            </span>
          </motion.h1>
          <motion.p {...rise(0.14)} className="mt-6 max-w-md text-[17px] leading-relaxed text-neutral-500">
            Every morning STACK reads your email, chat, calendar and tasks, and hands you one brief: what needs you, why, and
            what to do next. Nothing changes without your OK.
          </motion.p>
          <motion.div {...rise(0.22)} className="mt-9 flex flex-wrap items-center gap-6">
            <Link href="/signup" className="btn-stack group">
              Get started free
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="#story" className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-ink underline decoration-neutral-300 underline-offset-4 hover:decoration-ink">
              Follow one morning
              <ArrowDown size={15} className="transition-transform group-hover:translate-y-0.5" />
            </Link>
          </motion.div>
          <motion.p {...rise(0.3)} className="mt-8 text-sm text-neutral-500">
            Free during early access · Read-only by default · No credit card
          </motion.p>
        </div>

        {/* The signature moment: the morning's mess lands on the desk, then gathers into one neat stack. */}
        <div className="relative mx-auto w-full max-w-[560px]" style={{ height: BRIEF_TOP + 330 }}>
          {SHEETS.map((s, i) => {
            const depth = SHEETS.length - i; // 6 = furthest back
            return (
              <motion.div
                key={s.app}
                aria-hidden
                initial={{ opacity: 0, x: s.sx, y: i * PEEK + s.sy - 40, rotate: s.sr, scale: 0.92 }}
                animate={{
                  opacity: [0, 1, 1],
                  x: [s.sx, s.sx, 0],
                  y: [i * PEEK + s.sy - 40, i * PEEK + s.sy, i * PEEK],
                  rotate: [s.sr, s.sr, 0],
                  scale: [0.92, 0.92, 1 - depth * 0.018],
                }}
                transition={{ duration: 2.1, times: [0, 0.3, 1], delay: 0.35 + i * 0.07, ease }}
                className="clay-sm absolute inset-x-0 top-0 h-[300px] bg-white shadow-[0_14px_24px_-18px_rgba(0,0,0,0.35)]"
              >
                <div className="flex h-[30px] items-center gap-2 px-5">
                  <IntegrationLogo app={s.app} name={s.name} size="sm" />
                  <span className="text-[12px] font-semibold text-ink">{s.name}</span>
                  <span className="truncate text-[12px] text-neutral-500">{s.line}</span>
                </div>
              </motion.div>
            );
          })}

          {/* The brief lands on top once everything is in its place. */}
          <motion.article
            initial={{ opacity: 0, y: BRIEF_TOP - 50 }}
            animate={{ opacity: 1, y: BRIEF_TOP }}
            transition={{ duration: 0.8, delay: 2.15, ease }}
            className="clay absolute inset-x-0 top-0 bg-white shadow-[0_40px_60px_-30px_rgba(0,0,0,0.38),0_4px_10px_-4px_rgba(0,0,0,0.08)]"
          >
            <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <LogoMark size={20} animate={false} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Morning brief</p>
                  <p className="text-[13px] font-medium text-ink">Tuesday, 8:48 AM</p>
                </div>
              </div>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Example</span>
            </header>
            <div className="px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Most important</p>
              <p className="mt-2 text-[17px] font-semibold text-ink">
                <span className="highlight" style={{ animationDelay: "2.9s" }}>Send Sarah the Q4 proposal</span>
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">She&apos;s asked twice, by email and in Slack, and needs it by tomorrow.</p>
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                <Sources apps={[{ id: "gmail", name: "Gmail" }, { id: "slack", name: "Slack" }]} />
                <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-ink px-3 py-1.5 text-xs font-medium text-paper">
                  <Sparkles size={12} /> Draft reply
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-neutral-100 text-[13px]">
              <div className="border-r border-neutral-100 px-5 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Next up</p>
                <p className="mt-1 font-medium text-ink">10:00 · Design review</p>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Can wait</p>
                <p className="mt-1 flex items-center gap-1.5 text-neutral-500">
                  <Check size={13} className="text-green" /> 19 newsletters
                </p>
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
