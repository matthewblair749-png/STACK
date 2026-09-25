"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "12,000+", label: "Teams onboarded" },
  { value: "180+", label: "Apps connected" },
  { value: "4.9/5", label: "Average rating" },
  { value: "38%", label: "Less time in tabs" },
];

export function StatsBar() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 gap-8 rounded-3xl border border-neutral-100 px-8 py-12 sm:grid-cols-4 sm:gap-6 sm:py-14"
      >
        {stats.map((s, i) => (
          <div key={s.label} className="text-center">
            <p className={`text-4xl font-semibold tracking-tight sm:text-6xl ${i === 0 ? "text-blue" : "text-ink"}`}>
              {s.value}
            </p>
            <p className="mt-2 text-sm text-neutral-400">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
