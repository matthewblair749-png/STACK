"use client";

/*
 * Ideas borrowed from the best product sites, made STACK's own: a strip of the apps STACK connects (Notion, Vercel),
 * a try-it-yourself "Ask STACK" demo (Raycast, Notion), big honest numbers on their own panels (Apple, Stripe) and
 * an FAQ before the last call to action (Linear, Notion). Everything shown is real or clearly marked as an example.
 */
import { useState } from "react";
import { ChevronDown, CornerDownLeft, Sparkles } from "lucide-react";
import { IntegrationLogo, hasRealBrandIcon } from "@/components/brand-icons";
import { cn } from "@/lib/utils";
import { ChapterMark, Reveal, Sources } from "./primitives";

/* ------------------------------------------------------------------ apps strip under the hero */

export function AppMarquee({ apps }: { apps: { id: string; name: string }[] }) {
  // Only apps with their real logo; the strip repeats twice so it can scroll in a seamless loop.
  const shown = apps.filter((a) => hasRealBrandIcon(a.id)).slice(0, 18);
  if (shown.length < 6) return null;
  return (
    <section id="integrations" aria-label="Apps STACK connects" className="scroll-mt-24 px-6 pb-6 pt-2">
      <p className="text-center text-sm text-neutral-500">Works with the tools you already use</p>
      <div className="group relative mx-auto mt-6 max-w-6xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <ul className="flex w-max gap-3 py-3 pr-3 [animation:marquee_48s_linear_infinite] group-hover:[animation-play-state:paused]">
          {[...shown, ...shown].map((a, i) => (
            <li key={`${a.id}-${i}`} aria-hidden={i >= shown.length} className="clay-pill flex items-center gap-2.5 bg-white py-2.5 pl-3 pr-4">
              <IntegrationLogo app={a.id} name={a.name} size="md" />
              <span className="whitespace-nowrap text-sm font-medium text-neutral-700">{a.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ try it: Ask STACK */

type Answer = {
  q: string;
  lead: string;
  points?: { text: string; why?: string }[];
  sources: { id: string; name: string }[];
  draft?: { to: string; subject: string; body: string };
};

const ANSWERS: Answer[] = [
  {
    q: "What needs me today?",
    lead: "Three things. In this order:",
    points: [
      { text: "Send Sarah the Q4 proposal", why: "She's asked twice and needs it by tomorrow" },
      { text: "Fix the failing build on main", why: "It blocks today's release" },
      { text: "Prep for the 2:00 launch sync", why: "You're presenting, two questions are open" },
    ],
    sources: [{ id: "gmail", name: "Gmail" }, { id: "slack", name: "Slack" }, { id: "github", name: "GitHub" }, { id: "google-calendar", name: "Calendar" }],
  },
  {
    q: "Which projects are at risk?",
    lead: "One project is drifting:",
    points: [
      { text: "Mobile redesign", why: "No updates in 6 days, and 2 of its tasks are overdue" },
      { text: "Dev is waiting on your review", why: "Dev asked in #mobile on Friday" },
    ],
    sources: [{ id: "linear", name: "Linear" }, { id: "slack", name: "Slack" }],
  },
  {
    q: "What did I miss overnight?",
    lead: "Since you logged off yesterday:",
    points: [
      { text: "Three pull requests merged, and the build on main started failing" },
      { text: "The design review moved from Tuesday to today, 10:00" },
      { text: "The launch plan was edited four times" },
    ],
    sources: [{ id: "github", name: "GitHub" }, { id: "google-calendar", name: "Calendar" }, { id: "notion", name: "Notion" }],
  },
  {
    q: "Tell Sarah she'll have it by noon",
    lead: "Here's a draft. It won't be sent until you approve it:",
    draft: {
      to: "sarah@acme.example",
      subject: "Re: Q4 proposal",
      body: "Hi Sarah, thanks for your patience, and sorry for the wait. You'll have the final Q4 proposal from me by noon today.",
    },
    sources: [{ id: "gmail", name: "Gmail" }],
  },
];

export function AskDemo() {
  const [active, setActive] = useState(0);
  const a = ANSWERS[active];
  return (
    <section id="try" className="scroll-mt-24 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <ChapterMark time="Any time" stage="Ask" />
          </div>
          <h2 className="mt-6 text-balance text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[3.25rem]">
            Ask STACK <span className="highlight">anything</span> about your work.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-neutral-500">Pick a question. Every answer shows where it came from.</p>
        </Reveal>

        <div role="tablist" aria-label="Example questions" className="mt-10 flex flex-wrap justify-center gap-2.5">
          {ANSWERS.map((x, i) => (
            <button
              key={x.q}
              role="tab"
              aria-selected={i === active}
              aria-controls="ask-panel"
              onClick={() => setActive(i)}
              className={cn(
                "clay-pill px-4 py-2.5 text-sm font-medium transition-colors",
                i === active ? "!bg-[linear-gradient(180deg,#a9bbff,#6f8cff)] text-ink" : "bg-white text-neutral-700 hover:text-ink",
              )}
            >
              {x.q}
            </button>
          ))}
        </div>

        <div id="ask-panel" role="tabpanel" className="clay relative mx-auto mt-8 max-w-3xl bg-white p-6 sm:p-8">
          <span className="absolute left-6 top-6 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">Example</span>
          {/* A new key swaps the answer at once; it fades up with a short CSS animation (nothing to wait for). */}
          <div key={active} className="[animation:panel-in_0.4s_cubic-bezier(0.22,1,0.36,1)]">
              <p className="ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-[6px] bg-neutral-50 px-4 py-2.5 text-[15px] text-ink">{a.q}</p>
              <div className="mt-5 flex gap-3">
                <span className="clay-pill flex h-8 w-8 shrink-0 items-center justify-center !bg-[linear-gradient(180deg,#a9bbff,#6f8cff)]">
                  <Sparkles size={14} className="text-ink" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-ink">{a.lead}</p>
                  {a.points && (
                    <ul className="mt-3 space-y-2.5">
                      {a.points.map((pt) => (
                        <li key={pt.text} className="clay-sm bg-neutral-25 px-4 py-3">
                          <span className="block text-[15px] font-semibold text-ink">{pt.text}</span>
                          {pt.why && <span className="mt-0.5 block text-sm text-blue">{pt.why}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {a.draft && (
                    <div className="clay-sm mt-3 bg-neutral-25 p-4">
                      <p className="text-sm text-neutral-500">
                        To <span className="text-ink">{a.draft.to}</span> · {a.draft.subject}
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed text-ink">{a.draft.body}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="mr-auto text-xs font-medium text-[#2f4fe0]">Waiting for your approval</span>
                        <span className="clay-pill bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">Cancel</span>
                        <span className="clay-pill bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">Edit</span>
                        <span className="clay-pill inline-flex items-center gap-1.5 !bg-[linear-gradient(180deg,#a9bbff,#6f8cff)] px-3 py-1.5 text-xs font-semibold text-ink">
                          <CornerDownLeft size={12} /> Approve
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-500">Sources</span>
                    <Sources apps={a.sources} />
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ big numbers */

export function NumbersRow({ appCount }: { appCount: number }) {
  const items = [
    [String(appCount), "apps connect today"],
    ["0", "actions taken without your OK"],
    ["AES-256", "encryption on every connection"],
    ["$0", "while STACK is in early access"],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([n, label], i) => (
          <Reveal key={label} delay={i * 0.06} className="clay bg-white px-7 py-8">
            <p className="text-[2.75rem] font-semibold leading-none tracking-[-0.04em] text-ink">{n}</p>
            <p className="mt-3 text-[15px] text-neutral-500">{label}</p>
          </Reveal>
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ FAQ */

const FAQ = [
  ["Is STACK free?", "Yes, while it's in early access. There's no card and no trial clock. If paid plans come later, you'll hear about it before anything is ever charged."],
  ["What can STACK see in my apps?", "Only the apps you connect, and read-only wherever an app lets you choose. Every connection's token is encrypted with AES-256-GCM and never sent back to your browser."],
  ["Will STACK send emails or change things on its own?", "No. When STACK drafts a reply, a task or an invite, it waits for you to approve, edit or cancel it. Nothing is sent, created or changed on its own."],
  ["Which apps does it work with?", "Email, calendar and files from Google, plus chat, task, CRM, support, code and research tools - many of them scroll past at the top of this page, and you'll see every one when you sign up. Each connects in about a minute."],
  ["Can I take my data back out?", "Disconnect an app and STACK revokes its access where the app allows it and deletes what it imported. You can delete your whole account from Settings at any time."],
  ["Does it work on my phone?", "Yes. STACK runs in your browser on any screen - check your brief on your phone, act on it at your desk. Nothing to install."],
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-balance text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[3.25rem]">Questions, answered.</h2>
        </Reveal>
        <div className="mt-12 space-y-3">
          {FAQ.map(([q, a], i) => (
            <Reveal key={q} delay={i * 0.04}>
              <details className="clay-sm group bg-white px-6 py-1 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold text-ink">
                  {q}
                  <span className="clay-pill flex h-8 w-8 shrink-0 items-center justify-center bg-neutral-25 transition-transform group-open:rotate-180">
                    <ChevronDown size={16} />
                  </span>
                </summary>
                <p className="pb-5 pr-12 text-[15px] leading-relaxed text-neutral-500">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
