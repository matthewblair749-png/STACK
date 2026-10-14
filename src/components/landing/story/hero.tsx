"use client";

/*
 * A split hero: the promise on the left, the product on the right, both above the fold. The right side is your brief,
 * sitting on the neat stack of apps it was read from. "Your morning as a..." switches the role - founder, engineer,
 * sales, designer - and the stack and the brief change with it, so people see their own day rather than someone
 * else's. It cycles on its own until someone picks a role, and the #1 priority's draft can really be approved
 * (it's an example, so nothing is sent). Everything shown is example data.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, Check, CornerDownLeft, Sparkles, Undo2 } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } });
const enter = "[animation:panel-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both]";

/* ------------------------------------------------------------------ example mornings */

type Priority = { title: string; why: string; app: string };
type Morning = {
  role: string;
  updates: number;
  apps: { app: string; name: string; line: string }[];
  priorities: [Priority, Priority, Priority];
  draft: { to: string; text: string };
};

const MORNINGS: Morning[] = [
  {
    role: "Founder",
    updates: 186,
    apps: [
      { app: "gmail", name: "Gmail", line: "71 new · Re: Q4 proposal" },
      { app: "slack", name: "Slack", line: "48 threads · #hiring" },
      { app: "google-calendar", name: "Calendar", line: "Investor update at 2:00" },
    ],
    priorities: [
      { title: "Send Sarah the Q4 proposal", why: "Asked twice · due tomorrow", app: "gmail" },
      { title: "Prep the 2:00 investor update", why: "You're presenting · deck not shared yet", app: "google-calendar" },
      { title: "Make the hiring call on Maya", why: "Team waiting on you since Friday", app: "slack" },
    ],
    draft: { to: "Draft to Sarah · Re: Q4 proposal", text: "Thanks for your patience - you'll have the final Q4 proposal from me by noon today." },
  },
  {
    role: "Engineer",
    updates: 143,
    apps: [
      { app: "github", name: "GitHub", line: "27 notifications · CI failing" },
      { app: "linear", name: "Linear", line: "9 issues updated · Launch" },
      { app: "slack", name: "Slack", line: "31 threads · #eng" },
    ],
    priorities: [
      { title: "Fix the failing build on main", why: "Blocks today's release", app: "github" },
      { title: "Review Priya's auth PR", why: "Waiting 2 days · last approval needed", app: "github" },
      { title: "Answer the API question in #support", why: "Customer asked 3 hours ago", app: "slack" },
    ],
    draft: { to: "Draft to #eng · build on main", text: "Found it - a flaky date test. Reverting it now; main should be green within the hour." },
  },
  {
    role: "Sales",
    updates: 201,
    apps: [
      { app: "hubspot", name: "HubSpot", line: "12 deals changed stage" },
      { app: "gmail", name: "Gmail", line: "88 new · Re: revised quote" },
      { app: "google-calendar", name: "Calendar", line: "Northwind demo at 11:00" },
    ],
    priorities: [
      { title: "Send Acme the revised quote", why: "Closes Friday · they asked twice", app: "gmail" },
      { title: "Prep the 11:00 Northwind demo", why: "A new stakeholder is joining", app: "google-calendar" },
      { title: "Follow up with Globex", why: "No reply in 9 days · deal at risk", app: "hubspot" },
    ],
    draft: { to: "Draft to Dana · Re: revised quote", text: "Hi Dana - the revised quote is attached, with the 3-year terms you asked about." },
  },
  {
    role: "Designer",
    updates: 128,
    apps: [
      { app: "figma", name: "Figma", line: "6 comments · Checkout flow" },
      { app: "notion", name: "Notion", line: "Onboarding copy edited" },
      { app: "google-calendar", name: "Calendar", line: "Design crit at 3:00" },
    ],
    priorities: [
      { title: "Answer 6 comments on checkout", why: "Dev handoff is today", app: "figma" },
      { title: "Review the onboarding copy", why: "Priya asked for your eyes by noon", app: "notion" },
      { title: "Get ready for the 3:00 crit", why: "You're presenting the new nav", app: "google-calendar" },
    ],
    draft: { to: "Draft replies · Checkout flow", text: "Six answers drafted - the two about the promo field link to the spec Priya updated." },
  },
];

/** How long each morning shows before the next one, while nobody has picked one. */
const CYCLE_MS = 6500; // keep in step with the 6.5s timer line on the role switch

/* ------------------------------------------------------------------ the brief, on its stack */

function Brief({ m, approved, onApprove }: { m: Morning; approved: boolean; onApprove: () => void }) {
  return (
    <div className="relative">
      {/* the apps it was read from, squared up beneath it: each one peeks out below the next */}
      <div aria-hidden className="absolute inset-x-0 -bottom-[66px] top-10">
        {m.apps.map((a, i) => (
          <div
            key={`${m.role}-${a.app}`}
            className="absolute inset-x-0 bottom-0"
            style={{ transform: `translateY(${-i * 22}px) scale(${0.88 + i * 0.04})`, transformOrigin: "50% 100%", zIndex: i }}
          >
            {/* the offset lives on the outer layer, so the enter animation (which ends at transform: none) can't undo it */}
            <div className={cn("clay-sm flex h-[64px] items-end bg-white px-6 pb-[5px]", enter)} style={{ animationDelay: `${i * 70}ms` }}>
              <span className="flex min-w-0 items-center gap-2 text-[12px]">
                <IntegrationLogo app={a.app} name={a.name} size="sm" />
                <span className="font-semibold text-ink">{a.name}</span>
                <span className="truncate text-neutral-500">{a.line}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="clay relative z-10 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <LogoMark size={18} animate={false} /> Your brief
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[12px] tabular-nums text-neutral-500">8:47 AM</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Example</span>
          </span>
        </div>

        <div key={m.role} className={enter}>
          <p className="mt-5 text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">Good morning, Alex.</p>
          <p className="mt-1 text-sm text-neutral-500">
            {m.updates} updates from your apps, read. <span className="highlight font-medium text-ink">3 need you.</span>
          </p>

          <ol className="mt-5 space-y-1">
            {m.priorities.map((p, i) => (
              <li key={p.title} className={cn("rounded-2xl px-3 py-3", i === 0 && "bg-neutral-25 ring-1 ring-neutral-100", enter)} style={{ animationDelay: `${120 + i * 90}ms` }}>
                <div className="flex items-start gap-3">
                  <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", i === 0 ? "bg-[#ffe14d] text-[#121110]" : "bg-neutral-100 text-neutral-600")}>
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold leading-snug text-ink">{i === 0 ? <span className="highlight">{p.title}</span> : p.title}</span>
                    <span className="mt-0.5 block text-[12px] text-blue">{p.why}</span>
                  </span>
                  <IntegrationLogo app={p.app} size="sm" className="mt-1 shrink-0" />
                </div>

                {/* the next step for #1, already drafted and waiting for an OK */}
                {i === 0 && (
                  <div className="mt-3 rounded-xl border border-neutral-100 bg-white p-3 sm:ml-9">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
                      <Sparkles size={11} className="text-blue" /> {m.draft.to}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-snug text-ink">{m.draft.text}</p>
                    <div className="mt-2.5 flex min-h-[26px] items-center gap-2">
                      {approved ? (
                        <>
                          <span className="mr-auto inline-flex items-center gap-1 text-[12px] font-medium text-green">
                            <Check size={13} /> Approved <span className="font-normal text-neutral-500">(example, nothing sent)</span>
                          </span>
                          <button type="button" onClick={onApprove} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-neutral-500 hover:text-ink">
                            <Undo2 size={11} /> Undo
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="mr-auto text-[11px] font-medium text-[#a16207]">Waiting for your OK</span>
                          <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700">Edit</span>
                          <button
                            type="button"
                            onClick={onApprove}
                            className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(180deg,#ffeb73,#ffd630)] px-2.5 py-1 text-[11px] font-semibold text-[#121110] shadow-[0_6px_14px_-8px_rgba(161,98,7,0.6)] transition-transform hover:-translate-y-0.5"
                          >
                            <CornerDownLeft size={11} /> Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the hero */

export function StoryHero() {
  const still = !!useReducedMotion();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [approved, setApproved] = useState<number | null>(null);

  // Show each morning in turn until someone chooses one (and not while they're reading it).
  useEffect(() => {
    if (still || picked || paused) return;
    const id = window.setTimeout(() => setI((n) => (n + 1) % MORNINGS.length), CYCLE_MS);
    return () => window.clearTimeout(id);
  }, [i, still, picked, paused]);

  const m = MORNINGS[i];
  const cycling = !still && !picked && !paused;

  return (
    <section className="relative overflow-hidden px-6 pb-28 pt-12 sm:pt-16 lg:pb-32 lg:pt-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_78%_40%,rgba(255,225,77,0.2),transparent_70%),radial-gradient(ellipse_70%_55%_at_20%_0%,#fbfaf7_0%,rgba(251,250,247,0)_70%)]" />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        {/* the promise */}
        <div className="text-center lg:text-left">
          <motion.p {...rise(0)} className="clay-pill inline-flex items-center gap-2 bg-white px-4 py-1.5 text-[13px] font-medium text-neutral-700">
            <span className="h-2 w-2 rounded-full bg-green shadow-[0_0_0_3px_rgba(21,128,61,0.15)]" />
            Early access is open · free, no card
          </motion.p>
          <motion.h1 {...rise(0.06)} className="mt-7 text-balance text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[3.75rem] lg:text-wrap lg:text-[3.1rem] xl:text-[3.75rem]">
            {/* Three set lines beside the product; "what needs you" never splits. */}
            Know <span className="highlight whitespace-nowrap">what needs you</span>
            <br className="hidden lg:block" /> before you open
            <br className="hidden lg:block" /> a single app.
          </motion.h1>
          <motion.p {...rise(0.14)} className="mx-auto mt-6 max-w-[34rem] text-[17px] leading-relaxed text-neutral-500 sm:text-lg lg:mx-0">
            STACK reads your email, chats, calendar and tasks, then hands you one brief: what matters, why, and the next step,
            already drafted and waiting for your OK.
          </motion.p>
          <motion.div {...rise(0.22)} className="mt-9 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
            <Link href="/signup" className="btn-stack group">
              Get started free
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="#how" className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-ink underline decoration-neutral-300 underline-offset-4 hover:decoration-ink">
              See how it works
              <ArrowDown size={15} className="transition-transform group-hover:translate-y-0.5" />
            </Link>
          </motion.div>
          <motion.ul {...rise(0.3)} className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-neutral-500 lg:justify-start">
            {["Set up in about a minute", "Read-only by default", "Nothing sent without your OK"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-green" /> {t}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* the product: your morning, for your role */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease }}
          className="mx-auto w-full max-w-[520px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 lg:justify-start">
            <span className="text-[13px] font-medium text-neutral-500">Your morning as a</span>
            <div role="group" aria-label="Show an example morning for" className="clay-pill flex flex-wrap justify-center bg-white p-1">
              {MORNINGS.map((x, n) => (
                <button
                  key={x.role}
                  type="button"
                  aria-pressed={n === i}
                  onClick={() => {
                    setI(n);
                    setPicked(true);
                  }}
                  className={cn("relative overflow-hidden rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors", n === i ? "text-[#121110]" : "text-neutral-500 hover:text-ink")}
                >
                  {n === i && <motion.span layoutId="hero-role" transition={{ duration: 0.35, ease }} className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,#ffeb73,#ffd630)]" />}
                  <span className="relative">{x.role}</span>
                  {/* while it's cycling, a thin line shows when the next morning comes */}
                  {n === i && cycling && <span key={`t-${i}`} aria-hidden className="absolute bottom-0 left-0 h-[2px] bg-[rgba(18,17,16,0.35)] [animation:progress_6.5s_linear_forwards]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-6 pb-[70px]">
            <Brief m={m} approved={approved === i} onApprove={() => setApproved((a) => (a === i ? null : i))} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
