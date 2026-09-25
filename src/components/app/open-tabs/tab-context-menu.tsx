"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, XCircle, ArrowRightToLine, Pin, PinOff, Pencil, RotateCw, ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabMenuAction {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  danger?: boolean;
}

export function TabContextMenu({
  x,
  y,
  onClose,
  pinned,
  onCloseTab,
  onCloseOthers,
  onCloseToRight,
  onTogglePin,
  onRename,
  onRefresh,
  onOpenExternally,
  onAskStack,
}: {
  x: number;
  y: number;
  onClose: () => void;
  pinned: boolean;
  onCloseTab: () => void;
  onCloseOthers: () => void;
  onCloseToRight: () => void;
  onTogglePin: () => void;
  onRename: () => void;
  onRefresh: () => void;
  onOpenExternally: () => void;
  onAskStack: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const items: TabMenuAction[] = [
    { label: "Ask STACK about this tab", icon: Sparkles, onClick: onAskStack },
    { label: "Refresh", icon: RotateCw, onClick: onRefresh },
    { label: pinned ? "Unpin tab" : "Pin tab", icon: pinned ? PinOff : Pin, onClick: onTogglePin },
    { label: "Rename", icon: Pencil, onClick: onRename },
    { label: "Open externally", icon: ExternalLink, onClick: onOpenExternally },
    { label: "Close other tabs", icon: XCircle, onClick: onCloseOthers },
    { label: "Close tabs to the right", icon: ArrowRightToLine, onClick: onCloseToRight },
    { label: "Close", icon: X, onClick: onCloseTab, danger: true },
  ];

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.96, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.12 }}
        style={{ left: x, top: y }}
        className="fixed z-[120] w-56 overflow-hidden rounded-xl border border-neutral-100 bg-white p-1.5 shadow-2xl"
      >
        {items.map((it) => (
          <button
            key={it.label}
            onClick={() => {
              it.onClick();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium hover:bg-neutral-50",
              it.danger ? "text-red" : "text-ink",
            )}
          >
            <it.icon size={14} className={it.danger ? "text-red" : "text-neutral-400"} />
            {it.label}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
