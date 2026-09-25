"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 text-center sm:py-40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-5xl font-semibold tracking-tight text-ink sm:text-7xl">
          Bring your work together.
        </h2>
        <p className="mx-auto mt-6 max-w-md text-xl text-neutral-500">
          One workspace for the work you already do.
        </p>
        <Link href="/signup" className="mt-10 inline-block">
          <Button size="lg" className="group">
            Get started for free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>

        <div className="mt-20 flex flex-col items-center gap-3">
          <Logo size={28} />
          <p className="text-sm text-neutral-400">All your work, together.</p>
        </div>
      </motion.div>
    </section>
  );
}
