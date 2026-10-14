"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Eye, Hand, Lock, Link2, Trash2, LogOut } from "lucide-react";
import { IntegrationLogo, hasRealBrandIcon } from "@/components/brand-icons";
import { ChapterMark, Reveal } from "./primitives";
import { Coffee, DeskClock, StickyNote } from "./desk";

const ease = [0.22, 1, 0.36, 1] as const;

/* Every promise here is how the product works today - nothing aspirational. */
const promises = [
  { icon: Eye, title: "Read-only by default", body: "STACK asks for read-only access wherever an app lets you choose. Changing anything needs your separate OK." },
  { icon: Hand, title: "You approve every action", body: "Drafts, tasks and invites wait for you. Nothing is sent, created or changed on its own." },
  { icon: Lock, title: "Encrypted connections", body: "Every token for your apps is encrypted at rest with AES-256-GCM and never sent back to your browser." },
  { icon: Link2, title: "Shows its sources", body: "Every answer lists exactly which apps and items it used, with links back to the original." },
  { icon: Trash2, title: "Disconnect means gone", body: "Disconnect an app and STACK revokes access where the app allows it and deletes what it imported." },
  { icon: LogOut, title: "Leave whenever you want", body: "Delete your account from Settings at any time. Your workspace and everything in it is removed." },
];

export function TrustChapter() {
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
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promises.map((p, i) => (
            <Reveal key={p.title} delay={(i % 3) * 0.08} className="rounded-[14px] bg-white p-6 shadow-[0_18px_30px_-22px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.05)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-soft">
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

export function AppsChapter({ featured, total }: { featured: { id: string; name: string }[]; total: number }) {
  // Only apps with their real logo get a chip; the rest are counted, never shown with a stand-in mark.
  const shown = featured.filter((a) => hasRealBrandIcon(a.id));
  const more = featured.length - shown.length;
  return (
    <section id="integrations" className="scroll-mt-24 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl text-center">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Your tools stay your tools.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-500">
            STACK doesn&apos;t replace the apps your work lives in. It sits above them and makes sense of them together.{" "}
            {total} apps connect today, from email and chat to CRMs, support desks and code.
          </p>
        </Reveal>
        <div className="mx-auto mt-14 flex max-w-4xl flex-wrap justify-center gap-3">
          {shown.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.03, ease }}
              className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-2.5 pr-4 shadow-[0_8px_16px_-12px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.05)]"
            >
              <IntegrationLogo app={a.id} name={a.name} size="md" />
              <span className="text-sm font-medium text-neutral-700">{a.name}</span>
            </motion.div>
          ))}
          {more > 0 && (
            <Link href="/signup" className="flex items-center rounded-full border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-500 transition-colors hover:border-ink hover:text-ink">
              +{more} more
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function ClosingChapter() {
  return (
    <section className="relative overflow-hidden px-6 pb-32 pt-24 sm:pb-40 sm:pt-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,#fbfaf7_0%,rgba(251,250,247,0)_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        <StickyNote lines={["tomorrow 8:47", "open STACK first :)"]} className="left-[9%] top-[120px] rotate-[-6deg]" />
        <DeskClock className="right-[7%] top-[70px]" />
        <Coffee className="right-[8%] bottom-[70px]" />
      </div>
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
