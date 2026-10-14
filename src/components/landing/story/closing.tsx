"use client";

import Link from "next/link";
import { ArrowRight, Eye, Hand, Lock, Link2, Trash2, LogOut } from "lucide-react";
import { ChapterMark, Reveal } from "./primitives";
import { NumbersRow } from "./extras";


/* Every promise here is how the product works today - nothing aspirational. */
const promises = [
  { icon: Eye, title: "Read-only by default", body: "STACK asks for read-only access wherever an app lets you choose. Changing anything needs your separate OK." },
  { icon: Hand, title: "You approve every action", body: "Drafts, tasks and invites wait for you. Nothing is sent, created or changed on its own." },
  { icon: Lock, title: "Encrypted connections", body: "Every token for your apps is encrypted at rest with AES-256-GCM and never sent back to your browser." },
  { icon: Link2, title: "Shows its sources", body: "Every answer lists exactly which apps and items it used, with links back to the original." },
  { icon: Trash2, title: "Disconnect means gone", body: "Disconnect an app and STACK revokes access where the app allows it and deletes what it imported." },
  { icon: LogOut, title: "Leave whenever you want", body: "Delete your account from Settings at any time. Your workspace and everything in it is removed." },
];

export function TrustChapter({ appCount }: { appCount: number }) {
  return (
    <section id="trust" className="relative scroll-mt-24 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <ChapterMark time="Always" stage="Trust" />
          <h2 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Built like it&apos;s your data. Because it is.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-neutral-500">
            Letting an app read your work is a big ask. Here is exactly what STACK does with it. Each of these is how the
            product works today.
          </p>
        </Reveal>
        <div className="mt-14">
          <NumbersRow appCount={appCount} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promises.map((p, i) => (
            <Reveal key={p.title} delay={(i % 3) * 0.08} className="clay bg-white p-7 shadow-[0_18px_30px_-22px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.05)]">
              <span className="clay-pill flex h-10 w-10 items-center justify-center bg-blue-soft">
                <p.icon size={17} className="text-blue" strokeWidth={2} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ClosingChapter() {
  return (
    <section className="relative overflow-hidden px-6 pb-32 pt-24 sm:pb-40 sm:pt-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,#fbfaf7_0%,rgba(251,250,247,0)_70%)]" />
      <Reveal className="relative mx-auto max-w-2xl text-center">
        <div className="flex justify-center">
          <ChapterMark time="Tomorrow, 8:47 AM" />
        </div>
        <h2 className="mt-7 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[4.2rem]">
          This time, you <span className="highlight">start ahead.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-[17px] leading-relaxed text-neutral-500">
          Connect your first app in about a minute. STACK is free while it&apos;s in early access, no card needed.
        </p>
        <div className="mt-9 flex justify-center">
          <Link href="/signup" className="btn-stack group">
            Get started free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
