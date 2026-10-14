"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { Sources } from "./primitives";
import { Coffee, Keyboard, LaptopCorner, Paperclip, Pencil, StickyNote } from "./desk";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } });
/** Desk objects settle in from slightly further out, as if just put down. */
const settle = (delay: number, x = 0, y = 0) => ({ initial: { opacity: 0, x, y }, animate: { opacity: 1, x: 0, y: 0 }, transition: { duration: 1.1, delay, ease } });

export function StoryHero({ appCount }: { appCount: number }) {
  const points = ["Read-only by default", "You approve every action", `${appCount} apps connect today`];
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-16 sm:pt-24">
      {/* Light falling on the middle of the desk. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_30%,#ffffff_0%,rgba(255,255,255,0)_70%)]" />

      {/* The desk around the work. Only on screens wide enough to keep the middle clear. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
        <motion.div {...settle(0.5, -20, -10)}>
          <Paperclip className="left-[11%] top-[150px] rotate-[32deg]" />
        </motion.div>
        <motion.div {...settle(0.4, -40, 0)}>
          <Keyboard className="left-[-150px] top-[430px] rotate-[-14deg]" />
        </motion.div>
        <motion.div {...settle(0.45, 40, -30)}>
          <LaptopCorner className="right-[-330px] top-[-150px] rotate-[18deg]" />
        </motion.div>
        <motion.div {...settle(0.6, 30, 0)}>
          <Coffee className="right-[7%] top-[520px]" />
        </motion.div>
        <motion.div {...settle(0.7, -20, 20)}>
          <StickyNote lines={["1. reply to Sarah", "2. fix the build", "3. prep 2pm"]} className="left-[6%] top-[760px] rotate-[-5deg]" />
        </motion.div>
        <motion.div {...settle(0.8, 30, 10)}>
          <Pencil className="right-[4%] top-[850px] rotate-[-28deg]" />
        </motion.div>
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.p {...rise(0)} className="inline-flex items-center rounded-full bg-blue-soft px-3.5 py-1.5 text-[13px] font-medium text-blue">
          Free while STACK is in early access
        </motion.p>
        <motion.h1 {...rise(0.06)} className="mt-6 text-balance text-[2.9rem] font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[4.4rem]">
          Your workday, sorted
          <br className="hidden sm:block" /> before you start
        </motion.h1>
        <motion.p {...rise(0.14)} className="mx-auto mt-6 max-w-[30rem] text-[17px] leading-relaxed text-neutral-500">
          STACK reads your email, chat, calendar and tasks, then tells you what needs you today. Nothing changes without your
          OK.
        </motion.p>
        <motion.div {...rise(0.22)} className="mt-8 flex justify-center">
          <Link href="/signup" className={buttonClasses({ size: "md", className: "h-11 rounded-full px-6" })}>
            Get started free
          </Link>
        </motion.div>
        <motion.ul {...rise(0.3)} className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm text-neutral-700">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-blue text-paper">
                <Check size={11} strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </motion.ul>
      </div>

      {/* The morning brief, as paper on the desk, with yesterday's pages underneath. */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.35, ease }}
        className="relative mx-auto mt-16 max-w-[820px]"
      >
        <div aria-hidden className="absolute inset-x-6 -top-3 bottom-6 rotate-[-2.5deg] rounded-[14px] bg-[#ffffff] shadow-[0_18px_30px_-20px_rgba(0,0,0,0.3)]" />
        <div aria-hidden className="absolute inset-x-10 -top-1 bottom-4 rotate-[1.8deg] rounded-[14px] bg-[#fcfcfc] shadow-[0_18px_30px_-20px_rgba(0,0,0,0.25)]" />
        <article className="relative rounded-[14px] bg-white text-left shadow-[0_40px_60px_-34px_rgba(0,0,0,0.35),0_4px_10px_-4px_rgba(0,0,0,0.08)]">
          <header className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 sm:px-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Morning brief</p>
              <p className="mt-0.5 text-sm font-medium text-ink">Tuesday, 8:48 AM</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Example</span>
              <LogoMark size={22} animate={false} />
            </div>
          </header>

          <div className="grid sm:grid-cols-2">
            <div className="border-b border-neutral-100 p-6 sm:border-b-0 sm:border-r sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Most important</p>
              <p className="mt-3 flex items-center gap-2 text-lg font-semibold text-ink">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue text-[12px] font-semibold text-paper">1</span>
                Send Sarah the Q4 proposal
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">
                She&apos;s asked twice, once by email and once in Slack, and needs it by tomorrow.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Sources apps={[{ id: "gmail", name: "Gmail" }, { id: "slack", name: "Slack" }]} />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper">
                  <Sparkles size={12} /> Draft reply
                </span>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Today</p>
              <ul className="mt-3 space-y-3">
                {[
                  ["10:00", "Design review", "Moved from Tuesday"],
                  ["2:00", "Launch sync", "You're presenting"],
                ].map(([t, what, note]) => (
                  <li key={what} className="flex gap-3">
                    <span className="w-11 shrink-0 font-mono text-[13px] text-neutral-500">{t}</span>
                    <span>
                      <span className="block text-sm font-medium text-ink">{what}</span>
                      <span className="block text-xs text-neutral-500">{note}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 flex items-center gap-2 border-t border-dashed border-neutral-200 pt-4 text-sm text-neutral-500">
                <Check size={15} className="text-green" /> Can wait: 19 newsletters, 6 FYI threads
              </p>
            </div>
          </div>
        </article>
      </motion.div>
    </section>
  );
}
