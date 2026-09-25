"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, Video, MessageSquare } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { BrandIcon } from "@/components/brand-icons";

const INTRO_KEY = "stack-seen-intro";
const apps: Array<"gmail" | "slack" | "google-calendar" | "drive" | "notion"> = [
  "gmail",
  "slack",
  "google-calendar",
  "drive",
  "notion",
];

const streams = [
  { icon: CheckSquare, label: "Tasks" },
  { icon: Video, label: "Meetings" },
  { icon: MessageSquare, label: "Messages" },
];

// Plays once per browser on the very first Home load, then never again —
// the "seen" flag is set as soon as the sequence starts, and the state
// change that hides it happens inside a timeout so it never sets state
// synchronously from within an effect body.
export function IntroSequence() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = window.localStorage.getItem(INTRO_KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    queueMicrotask(() => {
      setVisible(true);
      try {
        window.localStorage.setItem(INTRO_KEY, "1");
      } catch {
        // Storage unavailable — the intro just won't be remembered as seen.
      }
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(id);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-paper"
        >
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <LogoMark size={44} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.35 }}
            className="flex items-center gap-3"
          >
            {apps.map((app, i) => (
              <motion.div
                key={app}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06, duration: 0.3 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-100 bg-white shadow-sm"
              >
                <BrandIcon id={app} size={18} />
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <span className="relative flex h-1.5 w-1.5">
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full bg-blue opacity-70"
                animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue" />
            </span>
            <p className="text-sm font-medium text-neutral-500">Organizing your day...</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.95, duration: 0.3 }}
            className="flex items-center gap-2"
          >
            {streams.map((s, i) => (
              <motion.span
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.08, duration: 0.25 }}
                className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600"
              >
                <s.icon size={12} /> {s.label}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
