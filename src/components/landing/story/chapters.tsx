"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Clock, AlertTriangle, CornerDownLeft, Hourglass } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { AppWindow, Chapter, ChapterMark, Reveal, Sources } from "./primitives";

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
        <div aria-hidden className="relative h-[480px] sm:h-[540px]">
          {noise.map((n, i) => {
            const rot = [-7, 5, -3, 8, -10, 4, -5, 9, -2, 6][i];
            const left = [4, 30, 10, 38, 0, 24, 14, 34, 6, 20][i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -40, rotate: rot * 2 }}
                whileInView={{ opacity: 1, y: 0, rotate: rot }}
                viewport={inView}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.11, ease }}
                className="absolute flex w-[260px] items-center gap-3 rounded-[10px] bg-white p-3 shadow-[0_16px_24px_-16px_rgba(0,0,0,0.35),0_1px_2px_rgba(0,0,0,0.06)] sm:w-[300px]"
                style={{ top: i * 46, left: `${left}%` }}
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

/* ------------------------------------------------------------------ 8:48 - Understand */

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

export function UnderstandChapter() {
  return (
    <Chapter
      mark={<ChapterMark time="8:48 AM" stage="Understand" />}
      title={<>STACK read it all, so you don&apos;t have to.</>}
      body={
        <>
          <p>
            It connects to the apps you already use, read-only, and turns the overnight pile into a few sentences you can
            actually take in.
          </p>
          <p>Every sentence links back to the email, thread or file it came from, so you can check it in one click.</p>
        </>
      }
      visual={
        <div className="relative">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {intake.map((app, i) => (
              <motion.span
                key={app}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={inView}
                transition={{ duration: 0.4, delay: i * 0.06, ease }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm"
              >
                <IntegrationLogo app={app} size="md" />
              </motion.span>
            ))}
            <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={inView} transition={{ delay: 0.6 }} className="ml-1 text-sm text-neutral-500">
              read 213 updates
            </motion.span>
          </div>
          <AppWindow title="STACK · Since yesterday">
            <ul className="divide-y divide-neutral-100">
              {digest.map((d, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={inView}
                  transition={{ duration: 0.55, delay: 0.5 + i * 0.25, ease }}
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
      }
    />
  );
}

/* ------------------------------------------------------------------ 8:49 - Prioritize */

const priorities = [
  { title: "Send Sarah the Q4 proposal", why: "Asked twice · due tomorrow", app: { id: "gmail", name: "Gmail" } },
  { title: "Fix the failing build on main", why: "Blocks today's release", app: { id: "github", name: "GitHub" } },
  { title: "Prep for the 2:00 launch sync", why: "You're presenting · 2 open questions", app: { id: "google-calendar", name: "Calendar" } },
];

export function PrioritizeChapter() {
  return (
    <Chapter
      flip
      mark={<ChapterMark time="8:49 AM" stage="Prioritize" />}
      title={<>Three things matter today. Each one says why.</>}
      body={
        <>
          <p>Not a longer to-do list. A short one, ranked, and every item carries its reason: who&apos;s waiting, what&apos;s due, what it blocks.</p>
          <p>Everything else is still there when you want it. It just stops shouting.</p>
        </>
      }
      visual={
        <AppWindow title="STACK · Priorities">
          <ol className="p-3 sm:p-4">
            {priorities.map((p, i) => (
              <motion.li
                key={p.title}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={inView}
                transition={{ duration: 0.55, delay: 0.2 + i * 0.18, ease }}
                className="flex items-start gap-4 rounded-2xl p-4 transition-colors hover:bg-neutral-25"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-ink">{p.title}</span>
                  <span className="mt-1 block text-sm text-blue">{p.why}</span>
                </span>
                <IntegrationLogo app={p.app.id} name={p.app.name} size="md" className="mt-1 shrink-0" />
              </motion.li>
            ))}
          </ol>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={inView}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="flex items-center gap-2 border-t border-neutral-100 bg-neutral-25 px-6 py-4 text-sm text-neutral-500"
          >
            <Check size={15} className="text-green" /> Can wait: 19 newsletters, 6 FYI threads, 11 notifications
          </motion.div>
        </AppWindow>
      }
    />
  );
}

/* ------------------------------------------------------------------ 9:02 - Act */

export function ActChapter() {
  return (
    <Chapter
      mark={<ChapterMark time="9:02 AM" stage="Act" />}
      title={<>Handle it here. Nothing happens without your OK.</>}
      body={
        <>
          <p>
            Ask STACK to draft the reply, create the task or book the meeting. It prepares everything, then waits for you to
            approve, edit or cancel.
          </p>
          <p>STACK never sends, creates or changes anything on its own. Not once, not quietly, not &ldquo;just this time.&rdquo;</p>
        </>
      }
      visual={
        <AppWindow title="STACK · Ask">
          <div className="space-y-4 p-5 sm:p-6">
            <Reveal className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-neutral-50 px-4 py-3 text-[15px] text-ink">
              Reply to Sarah and tell her the final proposal will be with her by noon.
            </Reveal>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: 0.6, delay: 0.45, ease }}
              className="rounded-2xl border border-neutral-200 p-5"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                <IntegrationLogo app="gmail" name="Gmail" size="sm" /> Email draft · from your Gmail
              </div>
              <p className="mt-3 text-sm text-neutral-500">
                To <span className="text-ink">sarah@acme.example</span> · Re: Q4 proposal
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">
                Hi Sarah, thanks for your patience, and sorry for the wait. You&apos;ll have the final Q4 proposal from me
                by noon today.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
                <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#a16207]">
                  <Hourglass size={13} /> Waiting for your approval
                </span>
                <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700">Cancel</span>
                <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700">Edit</span>
                <motion.span
                  initial={{ boxShadow: "0 0 0 0 rgba(47,94,255,0)" }}
                  whileInView={{ boxShadow: ["0 0 0 0 rgba(47,94,255,0.45)", "0 0 0 8px rgba(47,94,255,0)"] }}
                  viewport={inView}
                  transition={{ duration: 1.4, delay: 1.2, repeat: 2 }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper"
                >
                  <CornerDownLeft size={12} /> Approve
                </motion.span>
              </div>
            </motion.div>
          </div>
        </AppWindow>
      }
    />
  );
}

/* ------------------------------------------------------------------ 5:42 PM - Move forward */

const columns = [
  { icon: Clock, label: "Up next", tone: "text-blue", items: [["Tomorrow 9:30", "Pricing review with Dev"], ["Friday", "Launch checklist due"]] },
  { icon: Hourglass, label: "Waiting on others", tone: "text-[#a16207]", items: [["Dev · 2 days", "API spec for checkout"], ["Sarah · today", "Proposal sign-off"]] },
  { icon: AlertTriangle, label: "At risk", tone: "text-red", items: [["Mobile redesign", "No updates in 6 days"]] },
];

export function MoveForwardChapter() {
  return (
    <Chapter
      flip
      mark={<ChapterMark time="5:42 PM" stage="Move forward" />}
      title={<>End the day with nothing slipping.</>}
      body={
        <>
          <p>STACK keeps watch on what&apos;s next, who you&apos;re waiting on and what&apos;s quietly drifting, across every app at once.</p>
          <p>So tomorrow starts where today left off, not with another hunt through the tabs.</p>
        </>
      }
      visual={
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
                transition={{ duration: 0.55, delay: 0.2 + ci * 0.15, ease }}
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
      }
    />
  );
}
