"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { SectionHeader } from "./section-header";
import { avatarUrl } from "@/lib/avatars";

const testimonials = [
  {
    quote:
      "STACK replaced six open tabs and our morning standup. I open it once and I already know exactly what matters today.",
    name: "Sarah Chen",
    role: "Design Lead, Acme",
    avatarSeed: 47,
  },
  {
    quote:
      "Decisions used to get lost in chat. Now every meeting turns into a summary, action items and assigned tasks automatically.",
    name: "Marcus Webb",
    role: "PM, Globex",
    avatarSeed: 13,
  },
  {
    quote:
      "The daily AI brief became our executive routine. I get the company-wide picture in sixty seconds instead of sixty emails.",
    name: "Priya Nair",
    role: "COO, Initech",
    avatarSeed: 44,
  },
  {
    quote:
      "Automations quietly turn every meeting into tasks. Nobody on the team has to remember to do it anymore.",
    name: "Alex Rivera",
    role: "Engineering Lead, Umbrella",
    avatarSeed: 60,
  },
  {
    quote:
      "Universal search actually works — I find the right file, thread, or task in one search bar instead of five apps.",
    name: "Jordan Lee",
    role: "Freelance Designer",
    avatarSeed: 25,
  },
  {
    quote:
      "Onboarding new hires used to take a week of tribal knowledge. Now STACK just shows them what's happening.",
    name: "Morgan Blake",
    role: "Head of Ops, Hooli",
    avatarSeed: 8,
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
      <SectionHeader
        eyebrow="Loved by teams"
        title="Teams that stopped losing track of work."
        subtitle="From two-person startups to company-wide rollouts — here's what changes when everything lands in one place."
        className="max-w-2xl"
      />

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            className="flex flex-col rounded-3xl border border-neutral-100 bg-white p-7"
          >
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} size={14} className="fill-yellow text-yellow" />
              ))}
            </div>
            <p className="mt-4 flex-1 text-base leading-relaxed text-neutral-700">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-5 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl(t.avatarSeed, 72)}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-neutral-400">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
