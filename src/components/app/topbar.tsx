"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Bell, Menu, X, Sparkles, ArrowRight, Video } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { Sidebar } from "./sidebar";
import { useWorkState } from "./work-state-provider";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ title }: { title: string }) {
  const { setCommandOpen } = useDemo();
  const { state } = useWorkState();
  const { data: session } = useSession();
  const userInitial = (session?.user?.name ?? session?.user?.email ?? "?").charAt(0).toUpperCase();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const attention = state?.priorities ?? [];

  async function startCall() {
    if (startingCall) return;
    setStartingCall(true);
    try {
      const res = await fetch("/api/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const body = await res.json();
      if (res.ok) router.push(`/call/${body.call.id}`);
    } finally {
      setStartingCall(false);
    }
  }

  return (
    <>
      <header className="grid h-[68px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-neutral-100 bg-white/80 px-4 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3 overflow-hidden">
          <button className="shrink-0 rounded-lg p-1 md:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">{title}</p>
          </div>
        </div>

        <button
          onClick={() => setCommandOpen(true)}
          aria-label="Search everything"
          className="hidden h-10 w-[400px] items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-400 transition-colors hover:border-neutral-300 md:flex"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Search your work or ask a question...</span>
          <kbd className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">Ctrl K</kbd>
        </button>
        <button onClick={() => setCommandOpen(true)} className="flex h-9 w-9 items-center justify-center justify-self-center rounded-xl text-neutral-500 hover:bg-neutral-100 md:hidden" aria-label="Search">
          <Search size={17} />
        </button>

        <div className="flex items-center justify-end gap-1.5">
          <ThemeToggle />
          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              aria-expanded={notifOpen}
              aria-label={attention.length ? `${attention.length} things need your attention` : "Nothing needs your attention"}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-neutral-100"
            >
              <Bell size={17} />
              {attention.length > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 12 }} className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red" />
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-xl"
                >
                  <div className="border-b border-neutral-100 px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{attention.length ? `${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} your attention` : "You're all caught up"}</p>
                    <p className="text-xs text-neutral-400">Ranked by STACK, with the reason.</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {attention.slice(0, 4).map((p) => (
                      <button key={p.id} onClick={() => { setNotifOpen(false); router.push("/home#prioritize"); }} className="flex w-full items-start gap-3 border-b border-neutral-50 px-4 py-3 text-left last:border-0 hover:bg-neutral-50">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue" />
                        <span>
                          <span className="block text-sm text-ink">{p.title}</span>
                          <span className="block text-xs text-neutral-400">{p.why[0]}</span>
                        </span>
                      </button>
                    ))}
                    {attention.length === 0 && <p className="px-4 py-6 text-center text-sm text-neutral-400">Nothing is competing for your attention.</p>}
                  </div>
                  <Link href="/home" onClick={() => setNotifOpen(false)} className="flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-ink hover:bg-neutral-50">
                    Open Home <ArrowRight size={14} />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={startCall} disabled={startingCall} aria-label="Start a call" title="Start a call" className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 disabled:opacity-50">
            <Video size={17} />
          </button>

          <button onClick={() => router.push("/ai")} aria-label="Ask STACK AI" title="Ask STACK AI" className="flex h-9 w-9 items-center justify-center rounded-xl text-blue hover:bg-blue-soft">
            <Sparkles size={18} />
          </button>

          <Link href="/settings" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-soft text-xs font-semibold text-blue" aria-label="Your profile">
            {userInitial}
          </Link>
        </div>
      </header>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex bg-black/40 md:hidden" onClick={() => setMobileNavOpen(false)}>
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()} className="relative h-full">
              <button className="absolute right-[-44px] top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
                <X size={18} />
              </button>
              <Sidebar expanded onNavigate={() => setMobileNavOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
