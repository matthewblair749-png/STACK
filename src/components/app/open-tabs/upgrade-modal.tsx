"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown when every Open Tabs slot is in use. It only offers an upgrade when one can really be bought, and
 * only promises what a paid plan actually changes (more Open Tabs) - nothing that doesn't exist.
 */
export function UpgradeModal({
  open,
  onClose,
  used,
  limit,
  canUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  used: number;
  limit: number;
  canUpgrade: boolean;
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
            <div className="bg-gradient-to-br from-blue-soft to-paper px-6 pt-6 pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue shadow-sm">
                <LayoutGrid size={18} />
              </div>
              <p className="mt-4 text-lg font-semibold text-ink">You&apos;ve reached your Open Tabs limit.</p>
              <p className="mt-1.5 text-sm text-neutral-500">
                {canUpgrade
                  ? `The Free plan keeps up to ${limit} work apps open at once. Paid plans raise that to 10.`
                  : `You can keep up to ${limit} work apps open at once. Close one to open another.`}
              </p>
              <p className="mt-3 text-xs font-medium text-neutral-400">
                You&apos;re using {used} / {limit} Open Tabs
              </p>
            </div>

            <div className="flex flex-col gap-2 px-6 py-5">
              {canUpgrade && (
                <Link href="/billing" className="w-full">
                  <Button className="w-full">See plans</Button>
                </Link>
              )}
              <button onClick={onClose} className="w-full py-1.5 text-sm font-medium text-neutral-500 hover:text-ink">
                {canUpgrade ? "Not now" : "Got it"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
