"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Zap, Workflow, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: LayoutGrid, label: "10 Open Tabs" },
  { icon: Sparkles, label: "STACK AI" },
  { icon: Workflow, label: "Automations" },
  { icon: Zap, label: "Expanded workspace" },
];

export function UpgradeModal({
  open,
  onClose,
  used,
  limit,
}: {
  open: boolean;
  onClose: () => void;
  used: number;
  limit: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-[20px] border border-neutral-100 bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-br from-blue-soft to-white px-6 pt-6 pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue shadow-sm">
                <LayoutGrid size={18} />
              </div>
              <p className="mt-4 text-lg font-semibold text-ink">You&apos;ve reached your Open Tabs limit.</p>
              <p className="mt-1.5 text-sm text-neutral-500">
                Free accounts can keep up to {limit} work apps open at once. Upgrade to Solo to keep up to 10 Open
                Tabs together.
              </p>
              <p className="mt-3 text-xs font-medium text-neutral-400">
                You&apos;re using {used} / {limit} Open Tabs
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 px-6 py-4">
              {benefits.map((b) => (
                <div key={b.label} className="flex items-center gap-2 rounded-xl bg-neutral-50 px-2.5 py-2 text-xs text-neutral-600">
                  <b.icon size={13} className="text-blue" /> {b.label}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 px-6 pb-6">
              <Link href="/billing" className="w-full">
                <Button className="w-full">Upgrade to Solo →</Button>
              </Link>
              <button onClick={onClose} className="w-full py-1.5 text-sm font-medium text-neutral-400 hover:text-ink">
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
