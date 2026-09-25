"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls, motion } from "framer-motion";
import { Pin, X } from "lucide-react";
import { BrandIcon } from "@/components/brand-icons";
import type { OpenTab } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TabItem({
  tab,
  active,
  isRenaming,
  onActivate,
  onClose,
  onContextMenu,
  onRenameSubmit,
}: {
  tab: OpenTab;
  active: boolean;
  isRenaming: boolean;
  onActivate: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRenameSubmit: (title: string) => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={tab}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, scale: 0.9, width: 0 }}
      animate={{ opacity: 1, scale: 1, width: "auto" }}
      exit={{ opacity: 0, scale: 0.85, width: 0, transition: { duration: 0.16 } }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onPointerDown={(e) => controls.start(e)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e);
      }}
      className="list-none"
    >
      <motion.button
        onClick={onActivate}
        whileTap={{ scale: 0.98 }}
        title={tab.title}
        className={cn(
          "group flex h-9 min-w-[64px] max-w-[176px] shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
          active ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "bg-transparent text-neutral-500 hover:bg-neutral-100/80",
        )}
      >
        {tab.pinned && <Pin size={11} className="shrink-0 -mr-0.5 text-neutral-400" />}
        <BrandIcon id={tab.appId} size={14} className="shrink-0" />
        {isRenaming ? (
          <RenameInput key={tab.id} initialTitle={tab.title} onSubmit={onRenameSubmit} />
        ) : (
          <span className="truncate">{tab.title}</span>
        )}
        <span
          role="button"
          aria-label={`Close ${tab.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-neutral-400 opacity-0 hover:bg-neutral-200 hover:text-ink group-hover:opacity-100",
            active && "opacity-100",
          )}
        >
          <X size={11} />
        </span>
      </motion.button>
    </Reorder.Item>
  );
}

function RenameInput({ initialTitle, onSubmit }: { initialTitle: string; onSubmit: (title: string) => void }) {
  const [value, setValue] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.select());
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit(value.trim() || initialTitle);
        if (e.key === "Escape") onSubmit(initialTitle);
      }}
      onBlur={() => onSubmit(value.trim() || initialTitle)}
      className="w-20 bg-transparent text-sm outline-none"
      autoFocus
    />
  );
}
