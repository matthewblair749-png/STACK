"use client";

import { motion } from "framer-motion";
import { Lock, ShieldCheck, UserCheck } from "lucide-react";

/** Real commitments the product actually enforces - no invented user counts or ratings. */
const points = [
  { icon: ShieldCheck, text: "Read-only by default" },
  { icon: UserCheck, text: "Nothing sent without your approval" },
  { icon: Lock, text: "Connections encrypted" },
];

export function TrustRow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.24 }}
      className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
    >
      {points.map(({ icon: Icon, text }) => (
        <span key={text} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
          <Icon size={13} className="text-blue" /> {text}
        </span>
      ))}
      <span className="hidden h-4 w-px bg-neutral-200 sm:block" />
      <span className="text-xs text-neutral-400">Free during early access · No credit card</span>
    </motion.div>
  );
}
