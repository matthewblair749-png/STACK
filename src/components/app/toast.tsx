"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
}

const ToastContext = createContext<{ toast: (t: { title: string; description?: string; tone?: Tone }) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}

const ICON = { success: Check, error: AlertCircle, info: Info } as const;
const TONE = {
  success: "bg-green-soft text-green",
  error: "bg-red-soft text-red",
  info: "bg-blue-soft text-blue",
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    ({ title, description, tone = "info" }: { title: string; description?: string; tone?: Tone }) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-3), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[120] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const Icon = ICON[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)]"
              >
                <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", TONE[t.tone])}>
                  <Icon size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-xs text-neutral-500">{t.description}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="shrink-0 rounded-md p-0.5 text-neutral-300 hover:text-neutral-600">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
