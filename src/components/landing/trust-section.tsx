"use client";

import { motion } from "framer-motion";
import { Eye, FileSearch, Lock, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { SectionHeader } from "./section-header";

/**
 * What STACK actually guarantees, each one enforced in the product today. This replaced a set of
 * invented testimonials - STACK shows real commitments instead of quotes from people who don't exist.
 */
const commitments = [
  { icon: Eye, title: "Read-only by default", body: "STACK only reads from your apps, and asks for read-only access wherever an app lets you choose. Changing anything needs your separate OK." },
  { icon: UserCheck, title: "You approve every action", body: "Drafted an email or a task? It waits for your OK. Nothing is sent, created or changed on its own." },
  { icon: Lock, title: "Encrypted connections", body: "Every token and key for your apps is encrypted at rest with AES-256-GCM and never sent back to your browser." },
  { icon: FileSearch, title: "Shows its sources", body: "Every AI answer lists exactly which apps and items it used, with links back to the original." },
  { icon: ShieldCheck, title: "Disconnect means gone", body: "Disconnect an app and STACK revokes its access where the app allows it and deletes what it imported." },
  { icon: Trash2, title: "Leave whenever you want", body: "Delete your account from Settings at any time. Your workspace and everything in it is permanently removed." },
];

export function TrustSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
      <SectionHeader
        eyebrow="Built on trust"
        title="Your work is yours. STACK just helps."
        subtitle="Connecting your apps is a big ask. Here's exactly how STACK treats them - every one of these is how the product works today."
        className="max-w-2xl"
      />

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {commitments.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
              className="flex flex-col rounded-3xl border border-neutral-100 bg-white p-7"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-soft text-blue">
                <Icon size={18} />
              </span>
              <p className="mt-4 text-base font-semibold text-ink">{c.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{c.body}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
