"use client";

/*
 * How it works: the four steps of STACK's day in one section. On wide screens the steps sit in a sticky list on the
 * left that follows you as each step's screen scrolls past on the right (the pattern Linear and Apple use for
 * product walkthroughs); on phones each step's text sits above its screen.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Clock, CornerDownLeft, Hourglass } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { cn } from "@/lib/utils";
import { AppWindow, ChapterMark, Reveal, Sources } from "./primitives";

const ease = [0.22, 1, 0.36, 1] as const;
const inView = { once: true, margin: "-80px" } as const;

/* ------------------------------------------------------------------ the screens */

const digest = [
  {
    text: "Launch: the design review moved to 10:00 today, so two of your tasks are now due before it.",
    apps: [{ id: "google-calendar", name: "Calendar" }, { id: "linear", name: "Linear" }],
  },
  {
    text: "Sarah at Acme has asked twice about the Q4 proposal. She needs it by tomorrow.",
    apps: [{ id: "gmail", name: "Gmail" }, { id: "slack", name: "Slack" }],
  },
  {
    text: "Overnight, three pull requests merged and the build on main started failing.",
    apps: [{ id: "github", name: "GitHub" }],
  },
];
const intake = ["gmail", "slack", "google-calendar", "github", "linear", "notion", "google-drive", "asana"];

function UnderstandScreen() {
  return (
    <div className="relative">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {intake.map((app, i) => (
          <motion.span
            key={app}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={inView}
            transition={{ duration: 0.4, delay: i * 0.06, ease }}
            className="clay-sm flex h-11 w-11 items-center justify-center"
          >
            <IntegrationLogo app={app} size="md" />
          </motion.span>
        ))}
        <span className="ml-1 text-sm text-neutral-500">read 213 updates</span>
      </div>
      <AppWindow title="STACK · Since yesterday">
        <ul className="divide-y divide-neutral-100">
          {digest.map((d, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: 0.55, delay: 0.3 + i * 0.2, ease }}
              className="p-5 sm:p-6"
            >
              <p className="text-[15px] leading-relaxed text-ink">{d.text}</p>
              <div className="mt-3">
                <Sources apps={d.apps} />
              </div>
            </motion.li>
          ))}
        </ul>
      </AppWindow>
    </div>
  );
}

const priorities = [
  { title: "Send Sarah the Q4 proposal", why: "Asked twice · due tomorrow", app: { id: "gmail", name: "Gmail" } },
  { title: "Fix the failing build on main", why: "Blocks today's release", app: { id: "github", name: "GitHub" } },
  { title: "Prep for the 2:00 launch sync", why: "You're presenting · 2 open questions", app: { id: "google-calendar", name: "Calendar" } },
];

function PrioritizeScreen() {
  return (
    <AppWindow title="STACK · Priorities">
      <ol className="space-y-2 p-3 sm:p-4">
        {priorities.map((p, i) => (
          <motion.li
            key={p.title}
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={inView}
            transition={{ duration: 0.55, delay: 0.15 + i * 0.15, ease }}
            className="flex items-start gap-4 rounded-[18px] p-4 transition-colors hover:bg-neutral-25"
          >
            <span className="clay-pill flex h-8 w-8 shrink-0 items-center justify-center !bg-[#1f1d1a] text-sm font-semibold text-[#fffdf9]">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-ink">{p.title}</span>
              <span className="mt-1 block text-sm text-blue">{p.why}</span>
            </span>
            <IntegrationLogo app={p.app.id} name={p.app.name} size="md" className="mt-1 shrink-0" />
          </motion.li>
        ))}
      </ol>
      <div className="flex items-center gap-2 border-t border-neutral-100 bg-neutral-25/60 px-6 py-4 text-sm text-neutral-500">
        <Check size={15} className="text-green" /> Can wait: 19 newsletters, 6 FYI threads, 11 notifications
      </div>
    </AppWindow>
  );
}

function ActScreen() {
  return (
    <AppWindow title="STACK · Ask">
      <div className="space-y-4 p-5 sm:p-6">
        <p className="ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-[6px] bg-neutral-50 px-4 py-3 text-[15px] text-ink">
          Reply to Sarah and tell her the final proposal will be with her by noon.
        </p>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
          transition={{ duration: 0.6, delay: 0.3, ease }}
          className="clay-sm bg-neutral-25 p-5"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <IntegrationLogo app="gmail" name="Gmail" size="sm" /> Email draft · from your Gmail
          </div>
          <p className="mt-3 text-sm text-neutral-500">
            To <span className="text-ink">sarah@acme.example</span> · Re: Q4 proposal
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink">
            Hi Sarah, thanks for your patience, and sorry for the wait. You&apos;ll have the final Q4 proposal from me by noon
            today.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
            <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#2f4fe0]">
              <Hourglass size={13} /> Waiting for your approval
            </span>
            <span className="clay-pill bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">Cancel</span>
            <span className="clay-pill bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">Edit</span>
            <span className="clay-pill inline-flex items-center gap-1.5 !bg-[linear-gradient(180deg,#a9bbff,#6f8cff)] px-3 py-1.5 text-xs font-semibold text-ink">
              <CornerDownLeft size={12} /> Approve
            </span>
          </div>
        </motion.div>
      </div>
    </AppWindow>
  );
}

const columns = [
  { icon: Clock, label: "Up next", tone: "text-blue", items: [["Tomorrow 9:30", "Pricing review with Dev"], ["Friday", "Launch checklist due"]] },
  { icon: Hourglass, label: "Waiting on others", tone: "text-[#2f4fe0]", items: [["Dev · 2 days", "API spec for checkout"], ["Sarah · today", "Proposal sign-off"]] },
  { icon: AlertTriangle, label: "At risk", tone: "text-red", items: [["Mobile redesign", "No updates in 6 days"]] },
];

function MoveForwardScreen() {
  return (
    <AppWindow title="STACK · Move forward">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-6 py-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-soft">
          <Check size={14} className="text-green" />
        </span>
        <span className="text-sm font-medium text-ink">All three priorities done today</span>
      </div>
      <div className="grid gap-px bg-neutral-100 sm:grid-cols-3">
        {columns.map((c, ci) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ duration: 0.55, delay: 0.15 + ci * 0.12, ease }}
            className="bg-white p-5"
          >
            <p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${c.tone}`}>
              <c.icon size={13} /> {c.label}
            </p>
            <ul className="mt-4 space-y-4">
              {c.items.map(([meta, what]) => (
                <li key={what}>
                  <span className="block text-sm font-medium text-ink">{what}</span>
                  <span className="block text-xs text-neutral-500">{meta}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </AppWindow>
  );
}

/* ------------------------------------------------------------------ the steps */

const STEPS = [
  {
    time: "8:48 AM",
    stage: "Understand",
    title: "STACK reads it all, so you don't have to.",
    body: "It connects to the apps you already use, read-only, and turns the overnight pile into a few sentences, each linked back to the email, thread or file it came from.",
    Screen: UnderstandScreen,
  },
  {
    time: "8:49 AM",
    stage: "Prioritize",
    title: "Three things matter today. Each one says why.",
    body: "Not a longer to-do list. A short one, ranked, and every item carries its reason: who's waiting, what's due, what it blocks. Everything else stops shouting.",
    Screen: PrioritizeScreen,
  },
  {
    time: "9:02 AM",
    stage: "Act",
    title: "Handle it here. Nothing happens without your OK.",
    body: "Ask STACK to draft the reply, create the task or book the meeting. It prepares everything, then waits for you to approve, edit or cancel. It never acts on its own.",
    Screen: ActScreen,
  },
  {
    time: "5:42 PM",
    stage: "Move forward",
    title: "End the day with nothing slipping.",
    body: "STACK keeps watch on what's next, who you're waiting on and what's quietly drifting, so tomorrow starts where today left off.",
    Screen: MoveForwardScreen,
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  // The step whose screen crosses the middle of the window is the active one.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how" className="scroll-mt-24 px-6 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <div className="flex justify-center">
          <ChapterMark time="How it works" />
        </div>
        <h2 className="mt-6 text-balance text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[3.25rem]">
          From the pile to a plan, in <span className="highlight">four steps.</span>
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-neutral-500">The same morning, with STACK. Scroll through the day.</p>
      </Reveal>

      <div className="mx-auto mt-16 grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        {/* sticky step list (wide screens) */}
        <div className="hidden lg:block">
          <ol className="sticky top-28 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.stage} className="list-none">
                <button
                  type="button"
                  onClick={() => refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  aria-current={i === active ? "step" : undefined}
                  className={cn(
                    "w-full px-5 py-4 text-left transition-all duration-300",
                    i === active ? "clay-sm bg-white" : "rounded-[16px] opacity-60 hover:opacity-100",
                  )}
                >
                  <span className="flex items-center gap-2.5 font-mono text-[12px] text-neutral-500">
                    <span className={cn("h-2 w-2 rounded-full transition-colors", i === active ? "bg-[#2f4fe0]" : "bg-neutral-300")} />
                    <span className="text-ink">{s.time}</span>
                    <span aria-hidden className="h-px w-5 bg-neutral-300" />
                    <span className="uppercase">{s.stage}</span>
                  </span>
                  <span className="mt-2 block text-[17px] font-semibold leading-snug text-ink">{s.title}</span>
                  <span className={cn("grid transition-[grid-template-rows] duration-300", i === active ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <span className="overflow-hidden">
                      <span className="block pt-2 text-[15px] leading-relaxed text-neutral-500">{s.body}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* the screens */}
        <div className="space-y-20 lg:space-y-32">
          {STEPS.map(({ Screen, ...s }, i) => (
            <div
              key={s.stage}
              data-step={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
            >
              <div className="mb-7 lg:hidden">
                <ChapterMark time={s.time} stage={s.stage} />
                <h3 className="mt-4 text-balance text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink">{s.title}</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-neutral-500">{s.body}</p>
              </div>
              <div className="relative">
                <div aria-hidden className="pointer-events-none absolute -inset-10 rounded-[48px] bg-[radial-gradient(closest-side,rgba(47,94,255,0.06),transparent)]" />
                <div className="relative">
                  <Screen />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
