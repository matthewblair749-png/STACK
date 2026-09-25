"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, ExternalLink } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { appOfficialUrl, openableApps } from "@/lib/open-tabs-data";
import { BrandIcon } from "@/components/brand-icons";
import { TiltCard } from "@/components/app/tilt-card";
import type { SourceApp } from "@/lib/types";

const categories = ["Work", "Files", "Calendar", "Productivity", "CRM", "Payments / Finance", "Identity"] as const;

export function AppLauncher({
  open,
  onClose,
  onLimitReached,
}: {
  open: boolean;
  onClose: () => void;
  onLimitReached: () => void;
}) {
  return <AnimatePresence>{open && <LauncherBody onClose={onClose} onLimitReached={onLimitReached} />}</AnimatePresence>;
}

// Mounted fresh each time the launcher opens, so query state starts clean
// without needing an effect to reset it.
function LauncherBody({ onClose, onLimitReached }: { onClose: () => void; onLimitReached: () => void }) {
  const { openApp } = useDemo();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? openableApps.filter((a) => a.name.toLowerCase().includes(q)) : openableApps;
  }, [query]);

  function handleOpen(appId: SourceApp) {
    const name = openableApps.find((a) => a.id === appId)?.name;
    const result = openApp(appId, name);
    if (result.ok) {
      onClose();
      const url = appOfficialUrl[appId];
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } else {
      onLimitReached();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[105] flex items-start justify-center bg-black/40 p-4 pt-[8vh]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-neutral-100 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="text-base font-semibold text-ink">Open an app</p>
            <p className="text-xs text-neutral-400">Launch a work app in its own tab inside STACK.</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2.5 border-b border-neutral-100 px-5 py-3">
          <Search size={15} className="text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps..."
            className="flex-1 text-sm outline-none placeholder:text-neutral-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {query ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((app) => (
                <AppCard key={app.id} appId={app.id} name={app.name} onOpen={() => handleOpen(app.id)} />
              ))}
              {filtered.length === 0 && <p className="col-span-2 py-8 text-center text-sm text-neutral-400">No apps match &ldquo;{query}&rdquo;</p>}
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => {
                const items = openableApps.filter((a) => a.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{category}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map((app) => (
                        <AppCard key={app.id} appId={app.id} name={app.name} onOpen={() => handleOpen(app.id)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AppCard({ appId, name, onOpen }: { appId: SourceApp; name: string; onOpen: () => void }) {
  return (
    <TiltCard maxTilt={3}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 px-3.5 py-3 hover:border-neutral-200 hover:shadow-[0_10px_24px_-16px_rgba(0,0,0,0.16)]">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-50">
            <BrandIcon id={appId} size={16} />
          </div>
          <p className="truncate text-sm font-medium text-ink">{name}</p>
        </div>
        <button
          onClick={onOpen}
          className="shrink-0 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-neutral-200"
        >
          <span className="inline-flex items-center gap-1"><ExternalLink size={12} /> Open</span>
        </button>
      </div>
    </TiltCard>
  );
}
