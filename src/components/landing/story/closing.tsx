"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Eye, Hand, Lock, Link2, Trash2, LogOut } from "lucide-react";
import { IntegrationLogo, hasRealBrandIcon } from "@/components/brand-icons";
import { buttonClasses } from "@/components/ui/button";
import { ChapterMark, Reveal } from "./primitives";
import { Horizon } from "./space";

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
    <section id="trust" className="relative scroll-mt-24 border-t border-neutral-100 px-6 py-24 sm:py-32">
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
        <div className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {promises.map((p, i) => (
            <Reveal key={p.title} delay={(i % 3) * 0.08}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(165,150,255,0.08)] shadow-[0_0_24px_-8px_rgba(165,150,255,0.6)]">
                <p.icon size={18} className="text-blue" strokeWidth={1.75} />
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
              className="flex items-center gap-2.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] py-2.5 pl-3 pr-4 backdrop-blur"
            >
              <IntegrationLogo app={a.id} name={a.name} size="md" />
              <span className="text-sm font-medium text-neutral-700">{a.name}</span>
            </motion.div>
          ))}
          {more > 0 && (
            <Link href="/signup" className="flex items-center rounded-2xl border border-dashed border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:border-ink hover:text-ink">
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
    <section className="relative overflow-hidden px-6 pb-56 pt-28 sm:pb-72 sm:pt-40">
      <Horizon />
      <Reveal className="relative mx-auto max-w-3xl text-center">
        <div className="flex justify-center">
          <ChapterMark time="Tomorrow, 8:47 AM" dark />
        </div>
        <h2 className="mt-8 bg-gradient-to-b from-[#ffffff] via-[#fff1dc] to-[#ffc98a] bg-clip-text pb-2 text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-transparent sm:text-7xl">
          This time,
          <br />
          you start ahead.
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-neutral-500">
          Connect your first app in about a minute. STACK is free while we&apos;re in early access, no card needed.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={buttonClasses({ size: "lg", className: "group bg-[#ffffff] text-[#06050d] shadow-[0_0_50px_-8px_rgba(255,200,140,0.7)] hover:bg-[#fff4e6]" })}>
            Get started free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
