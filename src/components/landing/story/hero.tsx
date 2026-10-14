"use client";

/*
 * The hero is the before and after, live. It opens on the morning pile (213 unread across 6 apps), STACK reads it,
 * the noise falls away and the three things that matter rise to the top, ranked with their reasons - then a cursor
 * clicks "Draft reply" and the draft waits for your OK. A Without/With switch (the way Granola shows "My notes" next
 * to "Enhanced") lets people flip between the two at will. People who ask for less motion see the finished brief.
 * Everything shown is example data.
 */
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowDown, ArrowRight, Check, CornerDownLeft, Lock, RotateCcw, Sparkles } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } });
const reveal = "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

/* ------------------------------------------------------------------ example data */

type Item = { id: string; app: string; who: string; text: string; time: string; rank?: number };

/** The morning as it arrives, newest first. Three of these matter; the rest is noise. */
const PILE: Item[] = [
  { id: "n1", app: "slack", who: "#acme-account", text: "@alex did you see my message?", time: "8:41" },
  { id: "p0", app: "gmail", who: "Sarah Chen", text: "Re: Re: Q4 proposal - any update?", time: "8:39", rank: 0 },
  { id: "n2", app: "notion", who: "Launch plan", text: "4 changes by Priya", time: "8:30" },
  { id: "p1", app: "github", who: "ci / test", text: "Build failing on main", time: "8:22", rank: 1 },
  { id: "n3", app: "gmail", who: "Weekly digest", text: "Your top stories this week", time: "8:15" },
  { id: "n4", app: "linear", who: "Launch", text: "3 issues assigned to you", time: "8:02" },
  { id: "p2", app: "google-calendar", who: "Launch sync · 2:00", text: "You're presenting", time: "7:58", rank: 2 },
  { id: "n5", app: "slack", who: "#general", text: "Offsite photos are up!", time: "7:40" },
  { id: "n6", app: "asana", who: "Mobile redesign", text: "Task due tomorrow", time: "7:31" },
];

/** What each of the three becomes once STACK has read it. */
const RANKED: Record<string, { title: string; why: string }> = {
  p0: { title: "Send Sarah the Q4 proposal", why: "Asked twice · due tomorrow" },
  p1: { title: "Fix the failing build on main", why: "Blocks today's release" },
  p2: { title: "Prep for the 2:00 launch sync", why: "You're presenting" },
};

/** Where the 213 came from. */
const SOURCES = [
  { app: "gmail", name: "Gmail", n: 86 },
  { app: "slack", name: "Slack", n: 64 },
  { app: "github", name: "GitHub", n: 27 },
  { app: "linear", name: "Linear", n: 18 },
  { app: "notion", name: "Notion", n: 12 },
  { app: "google-calendar", name: "Calendar", n: 6 },
];

const NAV = ["Home", "Inbox", "My Work", "Projects", "Calendar", "Files", "STACK AI"];

/* ------------------------------------------------------------------ the timeline */

/** When each step happens (ms after start): pile, read, sort, rank, side panels, ask bar + cursor, click, draft, rest. */
const STEPS = [0, 1700, 2700, 3200, 3700, 4400, 5500, 5800, 6800];
const READ = 1;
const SORT = 2;
const RANK = 3;
const SIDE = 4;
const CURSOR = 5;
const CLICK = 6;
const DRAFT = 7;
const DONE = STEPS.length - 1;

type Mode = "before" | "after";

type Play = { mode: Mode; run: number; start: number };

/**
 * Where the demo is. "before" holds the raw pile; "after" plays the sort from `start` (each `run` plays it again).
 * With reduced motion "after" is simply finished.
 */
function useDemoPhase({ mode, run, start }: Play) {
  const still = !!useReducedMotion();
  const [state, setState] = useState({ run, phase: start });
  useEffect(() => {
    if (still || mode === "before") return;
    const timers = STEPS.slice(start + 1).map((ms, i) => window.setTimeout(() => setState({ run, phase: start + i + 1 }), ms - STEPS[start]));
    return () => timers.forEach(window.clearTimeout);
  }, [still, mode, run, start]);
  const phase = mode === "before" ? 0 : still ? DONE : state.run === run ? state.phase : start;
  return { phase, still };
}

/* ------------------------------------------------------------------ the demo */

function PileRow({ item, phase }: { item: Item; phase: number }) {
  const key = item.rank !== undefined;
  return (
    <div className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 transition-[background-color,opacity] duration-500", phase >= READ && (key ? "bg-[#fff6cc]" : "opacity-35"))}>
      <IntegrationLogo app={item.app} size="sm" className="shrink-0" />
      <span className="w-[7.5rem] shrink-0 truncate text-[13px] font-semibold text-ink">{item.who}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-500">{item.text}</span>
      <span className="shrink-0 text-[11px] tabular-nums text-neutral-400">{item.time}</span>
    </div>
  );
}

function RankedRow({ item, phase, button }: { item: Item; phase: number; button: React.RefObject<HTMLSpanElement | null> }) {
  const r = RANKED[item.id];
  const first = item.rank === 0;
  return (
    <div className="flex items-start gap-3 px-3 py-3 [animation:panel-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]" style={{ animationDelay: `${(item.rank ?? 0) * 90}ms` }}>
      <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", first ? "bg-[#ffe14d] text-[#121110]" : "bg-neutral-100 text-neutral-600")}>
        {(item.rank ?? 0) + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-snug text-ink sm:truncate">{first ? <span className="highlight">{r.title}</span> : r.title}</span>
        <span className="block text-[12px] text-blue">{r.why}</span>
      </span>
      {first ? (
        <span
          ref={button}
          className={cn(
            "mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-200",
            phase >= CLICK ? "scale-95 bg-[linear-gradient(180deg,#ffeb73,#ffd630)] text-[#121110]" : "bg-[#121110] text-[#fffdf9]",
          )}
        >
          <Sparkles size={11} /> Draft reply
        </span>
      ) : (
        <IntegrationLogo app={item.app} size="sm" className="mt-1 shrink-0" />
      )}
    </div>
  );
}

function LiveDemo({ phase, still }: { phase: number; still: boolean }) {
  const at = (n: number) => phase >= n;
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLSpanElement>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  // The cursor comes in from lower right and glides to "Draft reply" (measured, so it lands on the button at any width).
  useLayoutEffect(() => {
    if (phase !== CURSOR || !box.current || !button.current) return;
    const b = box.current.getBoundingClientRect();
    const r = button.current.getBoundingClientRect();
    const to = { x: r.left - b.left + r.width * 0.6, y: r.top - b.top + r.height * 0.55 };
    setCursor({ x: Math.min(to.x + 140, b.width - 30), y: to.y + 130 });
    const id = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setCursor(to)));
    return () => window.cancelAnimationFrame(id);
  }, [phase]);

  const items = at(SORT) ? PILE.filter((i) => i.rank !== undefined) : PILE;

  return (
    <div ref={box} aria-hidden className="relative mx-auto max-w-[1000px]">
      {/* soft light behind the product, and its shadow on the desk */}
      <div className="pointer-events-none absolute -inset-x-24 -inset-y-16 rounded-[64px] bg-[radial-gradient(60%_60%_at_50%_45%,rgba(255,225,77,0.22),rgba(47,79,224,0.06)_55%,transparent_80%)]" />
      <div className="pointer-events-none absolute -bottom-10 left-[8%] right-[8%] h-20 rounded-[50%] bg-[radial-gradient(closest-side,rgba(74,58,34,0.18),transparent)] blur-md" />

      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.25, ease }} className="relative">
        <div className="clay overflow-hidden bg-white">
          {/* browser chrome */}
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-25/70 px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f2c4bd]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f3dfae]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#c9e3c4]" />
            <span className="clay-pill mx-auto flex items-center gap-1.5 bg-white px-4 py-1 text-[12px] text-neutral-500">
              <Lock size={11} /> stackunder.website/home
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Example</span>
          </div>

          <div className="flex">
            <aside className="hidden w-[168px] shrink-0 flex-col border-r border-neutral-100 bg-neutral-25/60 px-3 py-4 md:flex">
              <div className="flex items-center gap-2 px-2">
                <LogoMark size={18} animate={false} />
                <span className="text-[13px] font-semibold text-ink">STACK</span>
              </div>
              <ul className="mt-5 space-y-1">
                {NAV.map((label, i) => (
                  <li key={label} className={i === 0 ? "clay-pill flex items-center gap-2 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink" : "flex items-center gap-2 px-3 py-1.5 text-[13px] text-neutral-500"}>
                    <span className={i === 0 ? "h-1.5 w-1.5 rounded-full bg-[#e8a400]" : "h-1.5 w-1.5 rounded-full bg-neutral-300"} />
                    {label}
                  </li>
                ))}
              </ul>
              <p className="mt-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Connected</p>
              <div className="mt-2 flex flex-wrap gap-1.5 px-2">
                {SOURCES.map((s) => (
                  <span key={s.app} className="clay-pill flex h-7 w-7 items-center justify-center bg-white">
                    <IntegrationLogo app={s.app} size="sm" />
                  </span>
                ))}
              </div>
            </aside>

            <div className="min-h-[480px] min-w-0 flex-1 p-4 sm:p-6">
              {/* the header: the pile's count, then the brief's greeting */}
              <div className="flex min-h-[58px] flex-wrap items-end justify-between gap-3">
                {at(SORT) ? (
                  <div key="brief" className="[animation:panel-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
                    <p className="text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">Good morning, Alex.</p>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      213 updates, sorted. <span className="highlight font-medium text-ink">3 need you.</span>
                    </p>
                  </div>
                ) : (
                  <div key="pile">
                    <p className="text-[12px] font-medium uppercase tracking-wider text-neutral-400">Tuesday · 8:47 AM</p>
                    <p className="mt-0.5 text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
                      213 unread <span className="text-neutral-400">across 6 apps</span>
                    </p>
                  </div>
                )}
                {at(SORT) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1 text-xs font-medium text-green [animation:panel-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
                    <span className="h-1.5 w-1.5 rounded-full bg-green" /> Up to date
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-4">
                  {/* one list: the pile, then - once read - only what matters, ranked */}
                  <section className="clay-sm relative overflow-hidden bg-white p-2">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider">
                      {at(SORT) ? <span className="text-blue">Priorities · ranked for you</span> : <span className="text-neutral-500">Everything, as it arrived</span>}
                    </p>
                    {/* STACK reading: a highlighter-yellow line sweeps down the pile */}
                    {phase === READ && !still && (
                      <motion.div
                        className="pointer-events-none absolute inset-x-0 h-12 bg-[linear-gradient(180deg,transparent,rgba(255,225,77,0.35),transparent)]"
                        initial={{ top: "0%" }}
                        animate={{ top: "100%" }}
                        transition={{ duration: 0.95, ease: "easeInOut" }}
                      />
                    )}
                    <AnimatePresence>
                      {items.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: at(SORT) ? 0 : 0.35 + i * 0.07, ease } }}
                          exit={{ opacity: 0, height: 0, transition: { duration: 0.45, ease } }}
                        >
                          {at(RANK) ? <RankedRow item={item} phase={phase} button={button} /> : <PileRow item={item} phase={phase} />}
                          {/* the draft opens under the #1 priority */}
                          {item.rank === 0 && at(DRAFT) && (
                            <motion.div
                              initial={still ? false : { opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              transition={{ duration: 0.5, ease }}
                              className="overflow-hidden"
                            >
                              <div className="mx-3 mb-2 rounded-2xl border border-neutral-100 bg-neutral-25 p-3">
                                <p className="flex items-center gap-2 text-[12px] font-medium text-neutral-500">
                                  <IntegrationLogo app="gmail" name="Gmail" size="sm" /> Draft to Sarah · Re: Q4 proposal
                                </p>
                                <p className="mt-2 text-[13px] leading-snug text-ink">
                                  Thanks for your patience - you&apos;ll have the final Q4 proposal from me by noon today.
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                  <span className="mr-auto text-[11px] font-medium text-[#a16207]">Waiting for your OK</span>
                                  <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700">Edit</span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(180deg,#ffeb73,#ffd630)] px-2.5 py-1 text-[11px] font-semibold text-[#121110]">
                                    <CornerDownLeft size={11} /> Approve
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </section>

                  {/* the same Ask bar as the real Home */}
                  <div className={cn("flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3", reveal, at(CURSOR) ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
                    <Sparkles size={15} className="shrink-0 text-blue" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-400">Ask STACK - what did I miss overnight?</span>
                    <span className="hidden rounded-md border border-neutral-200 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 sm:inline">⌘K</span>
                  </div>
                </div>

                <div className="min-w-0 space-y-4">
                  {at(SIDE) ? (
                    <>
                      <section className="clay-sm bg-white p-4 [animation:panel-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both]">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Today</p>
                        {[
                          ["10:00", "Design review", "Moved from 9:30"],
                          ["2:00", "Launch sync", "You're presenting"],
                        ].map(([t, what, note]) => (
                          <div key={what} className="mt-3 flex gap-3 border-l-2 border-[#ffe14d] pl-3">
                            <span className="w-10 shrink-0 font-mono text-[12px] text-neutral-500">{t}</span>
                            <span className="min-w-0">
                              <span className="block text-[13px] font-medium text-ink">{what}</span>
                              <span className="block text-[11px] text-neutral-500">{note}</span>
                            </span>
                          </div>
                        ))}
                      </section>
                      <section className="clay-sm bg-white p-4 [animation:panel-in_0.5s_cubic-bezier(0.22,1,0.36,1)_0.12s_both]">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-red">
                          <AlertTriangle size={12} /> At risk
                        </p>
                        <p className="mt-2 text-[13px] font-medium text-ink">Mobile redesign</p>
                        <p className="text-[12px] text-neutral-500">No updates in 6 days · due Friday</p>
                      </section>
                      <p className="px-1 text-[12px] text-neutral-500 [animation:panel-in_0.5s_cubic-bezier(0.22,1,0.36,1)_0.24s_both]">
                        210 other updates read and filed. Nothing else needs you yet.
                      </p>
                    </>
                  ) : (
                    /* where the pile came from - and, once STACK starts, each app ticked off as it's read */
                    <section className="clay-sm bg-white p-4">
                      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                        {at(READ) ? (
                          <>
                            <LogoMark size={13} animate={false} /> STACK is reading…
                          </>
                        ) : (
                          "6 apps open"
                        )}
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        {SOURCES.map((s, i) => (
                          <li key={s.app} className="flex items-center gap-2.5 text-[13px]">
                            <IntegrationLogo app={s.app} name={s.name} size="sm" />
                            <span className="font-medium text-ink">{s.name}</span>
                            <span className="ml-auto tabular-nums text-neutral-500">{s.n}</span>
                            <span className="flex h-4 w-4 items-center justify-center">
                              {at(READ) && (
                                <Check size={14} className="text-green [animation:panel-in_0.3s_ease-out_both]" style={{ animationDelay: `${i * 130}ms` }} />
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        {at(READ) && <div className="h-full rounded-full bg-[linear-gradient(90deg,#ffe14d,#ffcf1f)] [animation:progress_0.95s_cubic-bezier(0.22,1,0.36,1)_forwards]" />}
                      </div>
                      <p className="mt-3 text-[12px] text-neutral-500">{at(READ) ? "Finding what needs you…" : "Somewhere in here is what matters today."}</p>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* the cursor that clicks "Draft reply" */}
      {!still && cursor && phase >= CURSOR && phase < DONE && (
        <svg
          viewBox="0 0 24 24"
          className={cn(
            "pointer-events-none absolute z-10 hidden h-7 w-7 drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)] transition-[left,top,transform] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
            at(CLICK) && !at(DRAFT) ? "scale-75" : "scale-100",
          )}
          style={{ left: cursor.x, top: cursor.y }}
        >
          <path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.6 L12 13.8 L19 13.8 Z" fill="#121110" stroke="#fffdf9" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ the hero */

export function StoryHero() {
  const [play, setPlay] = useState<Play>({ mode: "after", run: 0, start: 0 });
  const { phase, still } = useDemoPhase(play);
  // On first play the switch follows the demo, flipping to "With STACK" as the pile is sorted; a click flips it at once.
  const showing: Mode = play.mode === "after" && (play.run > 0 || phase >= SORT) ? "after" : "before";
  // From the raw pile, "With STACK" goes straight to reading it; the replay button starts the morning over.
  const pick = (mode: Mode, start = READ) => setPlay((p) => ({ mode, run: p.run + 1, start: mode === "after" && p.mode === "before" ? start : 0 }));

  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-14 sm:pt-20 lg:pb-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,#fbfaf7_0%,rgba(251,250,247,0)_70%)]" />

      <div className="relative mx-auto max-w-4xl text-center">
        <motion.p {...rise(0)} className="clay-pill inline-flex items-center gap-2 bg-white px-4 py-1.5 text-[13px] font-medium text-neutral-700">
          <span className="h-2 w-2 rounded-full bg-green shadow-[0_0_0_3px_rgba(21,128,61,0.15)]" />
          Early access is open · free, no card
        </motion.p>
        <motion.h1 {...rise(0.06)} className="mt-7 text-balance text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[4rem] lg:text-[4.75rem]">
          Know <span className="highlight">what needs you</span>
          <br className="hidden sm:block" /> before you open an app.
        </motion.h1>
        <motion.p {...rise(0.14)} className="mx-auto mt-6 max-w-[38rem] text-[17px] leading-relaxed text-neutral-500 sm:text-lg">
          STACK reads your email, chats, calendar and tasks, then hands you one brief: what matters, why, and the next step,
          ready for your OK.
        </motion.p>
        <motion.div {...rise(0.22)} className="mt-9 flex flex-wrap items-center justify-center gap-6">
          <Link href="/signup" className="btn-stack group">
            Get started free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="#how" className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-ink underline decoration-neutral-300 underline-offset-4 hover:decoration-ink">
            See how it works
            <ArrowDown size={15} className="transition-transform group-hover:translate-y-0.5" />
          </Link>
        </motion.div>
        <motion.p {...rise(0.3)} className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-neutral-500">
          {["Set up in about a minute", "Read-only by default", "Nothing sent without your OK"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-green" /> {t}
            </span>
          ))}
        </motion.p>
      </div>

      {/* the before/after switch */}
      <motion.div {...rise(0.4)} className="relative mt-14 flex items-center justify-center gap-2 sm:mt-16">
        <div role="group" aria-label="Example morning" className="clay-pill relative flex bg-white p-1">
          {(
            [
              ["before", "Without STACK"],
              ["after", "With STACK"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={showing === m}
              onClick={() => pick(m)}
              className={cn("relative rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors", showing === m ? "text-[#121110]" : "text-neutral-500 hover:text-ink")}
            >
              {showing === m && (
                <motion.span
                  layoutId="hero-switch"
                  transition={{ duration: 0.35, ease }}
                  className={cn("absolute inset-0 rounded-full", m === "after" ? "bg-[linear-gradient(180deg,#ffeb73,#ffd630)]" : "bg-neutral-100")}
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                {m === "after" && <Sparkles size={13} />}
                {label}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => pick("after", 0)}
          aria-label="Replay the example"
          title="Replay"
          className="clay-pill flex h-9 w-9 items-center justify-center bg-white text-neutral-500 hover:text-ink"
        >
          <RotateCcw size={14} />
        </button>
      </motion.div>

      <div className="relative mt-6">
        <LiveDemo phase={phase} still={still} />
      </div>
    </section>
  );
}
