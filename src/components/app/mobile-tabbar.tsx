"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Home, CheckSquare, Inbox, FolderKanban, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AskStackBar } from "./ask-stack-bar";
import { useWorkState } from "./work-state-provider";

const tabs = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Work", href: "/tasks", icon: CheckSquare },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "AI", href: "/ai", icon: Sparkles },
];

/**
 * Mobile is a different experience, not a shrunken desktop: thumb-reach bottom navigation plus a
 * floating "Ask STACK" button that opens the command interface as a full-height sheet.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const [askOpen, setAskOpen] = useState(false);
  const { state } = useWorkState();
  const unread = state?.understand.counts.importantMessages ?? 0;
  const onAi = pathname?.startsWith("/ai");

  return (
    <>
      {!onAi && !askOpen && (
        <button
          onClick={() => setAskOpen(true)}
          aria-label="Ask STACK"
          className="fixed bottom-20 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.5)] md:hidden"
        >
          <Sparkles size={16} /> Ask STACK
        </button>
      )}

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-neutral-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className="relative flex flex-1 flex-col items-center gap-1 py-2">
              <Icon size={20} strokeWidth={2} className={active ? "text-blue" : "text-neutral-400"} />
              {tab.href === "/inbox" && unread > 0 && <span className="absolute right-[calc(50%-16px)] top-1.5 h-2 w-2 rounded-full bg-red" />}
              <span className={cn("text-[11px] font-medium", active ? "text-blue" : "text-neutral-400")}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <AnimatePresence>
        {askOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] bg-black/40 md:hidden" onClick={() => setAskOpen(false)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Ask STACK"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 top-16 overflow-y-auto rounded-t-[28px] bg-neutral-25 p-4 pb-10"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-lg font-semibold text-ink">Ask STACK</p>
                <button onClick={() => setAskOpen(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-500">
                  <X size={18} />
                </button>
              </div>
              <AskStackBar shortcuts={false} autoFocus onSubmitted={() => setAskOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
