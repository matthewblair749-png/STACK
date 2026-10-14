"use client";

/*
 * The hero: a centred headline, then the product itself - STACK's Home in a big window, the apps it read stacked
 * neatly behind it, and two moments floating in front: an answer with its sources, and a draft waiting for
 * approval. (The pattern Attio, Linear and Notion use: the product is the picture.) Everything is example data.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowDown, ArrowRight, Check, CornerDownLeft, Sparkles } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { LogoMark } from "@/components/logo";
import { Sources } from "./primitives";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } });

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

/* ------------------------------------------------------------------ the product composition */

/** The apps STACK read, stacked neatly behind the window with their headers peeking out. */
const SHEETS = [
  { app: "gmail", name: "Gmail", line: "23 new · Re: Q4 proposal" },
  { app: "slack", name: "Slack", line: "14 threads · #acme-account" },
  { app: "google-calendar", name: "Calendar", line: "Design review moved to 10:00" },
  { app: "github", name: "GitHub", line: "Build failing on main" },
];
const PEEK = 34;

const NAV = ["Home", "Inbox", "My Work", "Projects", "Calendar", "Files", "STACK AI"];
const PRIORITIES = [
  { title: "Send Sarah the Q4 proposal", why: "Asked twice · due tomorrow", app: "gmail" },
  { title: "Fix the failing build on main", why: "Blocks today's release", app: "github" },
  { title: "Prep for the 2:00 launch sync", why: "You're presenting", app: "google-calendar" },
];

function HomeWindow() {
  return (
    <div className="clay overflow-hidden bg-white">
      {/* title bar */}
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-25/60 px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f2c4bd]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f3dfae]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#c9e3c4]" />
        <span className="ml-3 text-xs font-medium text-neutral-500">STACK · Home</span>
        <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Example</span>
      </div>
      <div className="flex">
        {/* sidebar */}
        <aside className="hidden w-[170px] shrink-0 flex-col border-r border-neutral-100 bg-neutral-25/60 px-3 py-4 md:flex">
          <div className="flex items-center gap-2 px-2">
            <LogoMark size={18} animate={false} />
            <span className="text-[13px] font-semibold text-ink">STACK</span>
          </div>
          <ul className="mt-5 space-y-1">
            {NAV.map((label, i) => (
              <li
                key={label}
                className={i === 0 ? "clay-pill flex items-center gap-2 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink" : "flex items-center gap-2 px-3 py-1.5 text-[13px] text-neutral-500"}
              >
                <span className={i === 0 ? "h-1.5 w-1.5 rounded-full bg-[#e8a400]" : "h-1.5 w-1.5 rounded-full bg-neutral-300"} />
                {label}
                {label === "Inbox" && <span className="ml-auto rounded-full bg-ink px-1.5 text-[10px] font-semibold text-paper">4</span>}
              </li>
            ))}
          </ul>
          <p className="mt-6 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Connected</p>
          <div className="mt-2 flex flex-wrap gap-1.5 px-2">
            {["gmail", "slack", "google-calendar", "github", "notion", "linear"].map((app) => (
              <span key={app} className="clay-pill flex h-7 w-7 items-center justify-center bg-white">
                <IntegrationLogo app={app} size="sm" />
              </span>
            ))}
          </div>
        </aside>

        {/* main */}
        <div className="min-w-0 flex-1 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">Good morning, Alex.</p>
              <p className="mt-0.5 text-sm text-neutral-500">Here&apos;s what matters right now.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1 text-xs font-medium text-green">
              <span className="h-1.5 w-1.5 rounded-full bg-green" /> Up to date
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {["3 priorities", "2 meetings", "1 project at risk", "4 waiting on you"].map((c) => (
              <span key={c} className="clay-pill bg-white px-3 py-1 text-[12px] font-medium text-neutral-700">
                {c}
              </span>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            <section className="clay-sm bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue">Priorities</p>
              <ol className="mt-3 space-y-3">
                {PRIORITIES.map((p, i) => (
                  <li key={p.title} className="flex items-start gap-3">
                    <span className="clay-pill flex h-6 w-6 shrink-0 items-center justify-center !bg-[#1f1d1a] text-[11px] font-semibold text-[#fffdf9]">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">
                        {i === 0 ? (
                          <span className="highlight" style={{ animationDelay: "1.6s" }}>
                            {p.title}
                          </span>
                        ) : (
                          p.title
                        )}
                      </span>
                      <span className="block text-[12px] text-blue">{p.why}</span>
                    </span>
                    <IntegrationLogo app={p.app} size="sm" className="mt-1 shrink-0" />
                  </li>
                ))}
              </ol>
            </section>
            <div className="space-y-4">
              <section className="clay-sm bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Today</p>
                {[
                  ["10:00", "Design review"],
                  ["2:00", "Launch sync"],
                ].map(([t, what]) => (
                  <p key={what} className="mt-2 flex gap-3 text-[13px]">
                    <span className="w-10 font-mono text-neutral-500">{t}</span>
                    <span className="font-medium text-ink">{what}</span>
                  </p>
                ))}
              </section>
              <section className="clay-sm bg-white p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-red">
                  <AlertTriangle size={12} /> At risk
                </p>
                <p className="mt-2 text-[13px] font-medium text-ink">Mobile redesign</p>
                <p className="text-[12px] text-neutral-500">No updates in 6 days</p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** An answer, with where it came from - floats over the window's left edge. */
function AnswerCard() {
  return (
    <div className="clay w-[290px] bg-white p-4">
      <p className="ml-auto w-fit rounded-[14px] rounded-br-[5px] bg-neutral-50 px-3 py-2 text-[13px] text-ink">What did I miss overnight?</p>
      <div className="mt-3 flex gap-2.5">
        <span className="clay-pill flex h-7 w-7 shrink-0 items-center justify-center !bg-[linear-gradient(180deg,#ffeb73,#ffd630)]">
          <Sparkles size={13} className="text-ink" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] leading-snug text-ink">3 PRs merged and the build on main broke. The design review moved to 10:00.</p>
          <div className="mt-2">
            <Sources apps={[{ id: "github", name: "GitHub" }, { id: "google-calendar", name: "Calendar" }]} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A draft waiting for approval - floats over the window's right edge. */
function ApprovalCard() {
  return (
    <div className="clay w-[300px] bg-white p-4">
      <p className="flex items-center gap-2 text-[12px] font-medium text-neutral-500">
        <IntegrationLogo app="gmail" name="Gmail" size="sm" /> Reply to Sarah · Re: Q4 proposal
      </p>
      <p className="mt-2 text-[13px] leading-snug text-ink">You&apos;ll have the final Q4 proposal from me by noon today.</p>
      <div className="mt-3 flex items-center gap-2">
        <span className="mr-auto text-[11px] font-medium text-[#a16207]">Waiting for your OK</span>
        <span className="clay-pill bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700">Edit</span>
        <span className="clay-pill inline-flex items-center gap-1 !bg-[linear-gradient(180deg,#ffeb73,#ffd630)] px-2.5 py-1 text-[11px] font-semibold text-ink">
          <CornerDownLeft size={11} /> Approve
        </span>
      </div>
    </div>
  );
}

function ProductComposition() {
  return (
    <div className="relative mx-auto max-w-[980px]">
      {/* soft light behind the product */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-24 -inset-y-16 rounded-[64px] bg-[radial-gradient(60%_60%_at_50%_45%,rgba(255,225,77,0.22),rgba(47,94,255,0.06)_55%,transparent_80%)]"
      />

      {/* the apps STACK read, stacked behind the window */}
      <div aria-hidden className="relative mx-auto w-[88%]" style={{ height: SHEETS.length * PEEK }}>
        {SHEETS.map((s, i) => {
          const depth = SHEETS.length - i;
          return (
            <motion.div
              key={s.app}
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 + i * 0.09, ease }}
              className="absolute inset-x-0"
              style={{ top: i * PEEK }}
            >
              <div className="clay-sm h-[120px] bg-white" style={{ transform: `scale(${1 - depth * 0.025})`, transformOrigin: "50% 0" }}>
                <div className="flex h-[34px] items-center gap-2 px-5">
                  <IntegrationLogo app={s.app} name={s.name} size="sm" />
                  <span className="text-[12px] font-semibold text-ink">{s.name}</span>
                  <span className="truncate text-[12px] text-neutral-500">{s.line}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* STACK Home */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease }} className="relative -mt-2">
        <HomeWindow />
      </motion.div>

      {/* floating moments (wide screens) */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, x: -24, y: 12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 1.1, ease }}
        className="absolute -bottom-32 -left-24 hidden xl:block"
      >
        <div className="clay-float" style={{ ["--clay-rot" as string]: "-2deg" }}>
          <AnswerCard />
        </div>
      </motion.div>
      <motion.div
        aria-hidden
        initial={{ opacity: 0, x: 24, y: 12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 1.3, ease }}
        className="absolute -bottom-28 -right-24 hidden xl:block"
      >
        <div className="clay-float" style={{ ["--clay-rot" as string]: "2deg", animationDelay: "1.2s" }}>
          <ApprovalCard />
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ the hero */

export function StoryHero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-14 sm:pt-20 lg:pb-32 xl:pb-48">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,#fbfaf7_0%,rgba(251,250,247,0)_70%)]" />

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.p {...rise(0)} className="inline-flex items-center gap-2.5 font-mono text-[13px] text-neutral-500">
          <span className="h-2 w-2 rounded-full bg-[#e8a400]" />
          <span className="text-ink">8:47 AM</span> · Tuesday
        </motion.p>
        <motion.h1 {...rise(0.06)} className="mt-6 text-balance text-[3rem] font-semibold leading-[1.0] tracking-[-0.04em] text-ink sm:text-[4.5rem] lg:text-[5.25rem]">
          <span className="sr-only">All your work, in one neat stack.</span>
          <span aria-hidden>
            All your <RotatingWord />,
            <br className="hidden sm:block" /> in one <span className="highlight">neat stack.</span>
          </span>
        </motion.h1>
        <motion.p {...rise(0.14)} className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-neutral-500 sm:text-lg">
          Every morning STACK reads your email, chat, calendar and tasks, and hands you one brief: what needs you, why, and what to
          do next. Nothing changes without your OK.
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
          {["Free during early access", "Read-only by default", "No credit card"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-green" /> {t}
            </span>
          ))}
        </motion.p>
      </div>

      <div className="relative mt-16 sm:mt-20">
        <ProductComposition />
      </div>
    </section>
  );
}
