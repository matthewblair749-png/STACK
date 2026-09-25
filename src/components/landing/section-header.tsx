"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const accentText = {
  blue: "text-blue",
  yellow: "text-[#b3800a]",
  red: "text-red",
  neutral: "text-neutral-500",
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  accent = "blue",
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  accent?: keyof typeof accentText;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className={cn("mx-auto max-w-2xl text-center", className)}
    >
      <p className={cn("text-sm font-semibold uppercase tracking-wider", accentText[accent])}>{eyebrow}</p>
      <h2 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-6xl">{title}</h2>
      {subtitle && <p className="mt-6 text-lg text-neutral-500 sm:text-xl">{subtitle}</p>}
    </motion.div>
  );
}
