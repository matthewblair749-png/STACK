"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, X, Plus } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { BrandIcon } from "@/components/brand-icons";
import { cn } from "@/lib/utils";

export function MobileTabSwitcher({ onNewTab }: { onNewTab: () => void }) {
  const { openTabs, activeTabId, setActiveTab, closeTab, openTabsLimit } = useDemo();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-100 px-4">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink"
        >
          <LayoutGrid size={15} className="text-neutral-400" /> Open Tabs · {openTabs.length}
        </button>
        <span className="text-xs text-neutral-400">{openTabs.length}/{openTabsLimit}</span>
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] bg-black/40" onClick={() => setSheetOpen(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-[96] max-h-[70vh] overflow-y-auto rounded-t-[20px] bg-white p-4 shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-200" />
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-sm font-semibold text-ink">Open Tabs</p>
                <button onClick={() => setSheetOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400"><X size={15} /></button>
              </div>
              <div className="space-y-1">
                {openTabs.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id);
                      setSheetOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5",
                      t.id === activeTabId ? "bg-blue-soft" : "hover:bg-neutral-50",
                    )}
                  >
                    <BrandIcon id={t.appId} size={16} />
                    <span className="flex-1 truncate text-sm text-ink">{t.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(t.id);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-200"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setSheetOpen(false);
                  onNewTab();
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-200 py-2.5 text-sm font-medium text-neutral-500"
              >
                <Plus size={14} /> Open an app
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
