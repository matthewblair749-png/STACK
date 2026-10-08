"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { FloatingApps } from "./floating-apps";
import { TrustRow } from "./trust-row";
import { LogoCloud } from "./logo-cloud";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-8 sm:pt-28">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue" />
          The AI Workspace
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-6xl font-semibold tracking-tight text-ink sm:text-8xl"
        >
          All your work,
          <br />
          together.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mx-auto mt-6 max-w-xl text-base text-neutral-500 sm:text-lg"
        >
          STACK brings your tasks, projects, messages, meetings, files, and
          apps together in one intelligent workspace.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/signup" className={buttonClasses({ size: "lg", className: "group" })}>
            Get started
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/#product" className={buttonClasses({ size: "lg", variant: "outline" })}>
            <PlayCircle size={17} />
            See how it works
          </Link>
        </motion.div>

        <TrustRow />
      </div>

      <FloatingApps />
      <LogoCloud />
    </section>
  );
}
