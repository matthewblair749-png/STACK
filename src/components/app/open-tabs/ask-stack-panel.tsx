"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, CheckCircle2 } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { BrandIcon } from "@/components/brand-icons";
import type { OpenTab } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMsg {
  id: string;
  role: "user" | "ai";
  text: string;
  sources?: string[];
}

export function AskStackPanel({
  open,
  onOpenChange,
  focusTabId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  focusTabId: string | null;
}) {
  const { openTabs } = useDemo();

  return (
    <>
      <motion.button
        onClick={() => onOpenChange(true)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        aria-label="Ask STACK"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)]"
      >
        <Sparkles size={15} className="text-blue-soft" /> Ask STACK
      </motion.button>

      <AnimatePresence>
        {open && <PanelBody openTabs={openTabs} focusTabId={focusTabId} onClose={() => onOpenChange(false)} />}
      </AnimatePresence>
    </>
  );
}

// Mounted fresh each time the panel opens, so the selected sources and
// conversation start clean without needing an effect to reset them.
function PanelBody({
  openTabs,
  focusTabId,
  onClose,
}: {
  openTabs: OpenTab[];
  focusTabId: string | null;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() =>
    focusTabId && openTabs.some((t) => t.id === focusTabId) ? new Set([focusTabId]) : new Set(openTabs.map((t) => t.id)),
  );
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function ask(question: string) {
    if (!question.trim()) return;
    const scopedTabs = openTabs.filter((t) => selected.has(t.id));
    const userMsg: ChatMsg = { id: `q${nextId.current++}`, role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    const tabNames = scopedTabs.map((t) => t.title).join(", ");
    const prefixedQuestion = tabNames
      ? `(Context: I have these apps open in Open Tabs: ${tabNames}. STACK hasn't synced their content yet, only my tasks and projects.) ${question}`
      : question;
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prefixedQuestion }),
      });
      const body = await res.json();
      const text = res.ok ? body.answer : body.error || "Something went wrong asking STACK AI.";
      setMessages((prev) => [...prev, { id: `a${nextId.current++}`, role: "ai", text, sources: body.sources }]);
    } catch {
      setMessages((prev) => [...prev, { id: `a${nextId.current++}`, role: "ai", text: "Couldn't reach STACK AI. Try again." }]);
    } finally {
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] bg-black/20"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="fixed right-0 top-0 z-[96] flex h-full w-full max-w-sm flex-col border-l border-neutral-100 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-blue" />
            <p className="text-sm font-semibold text-ink">Ask STACK</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100">
            <X size={15} />
          </button>
        </div>

        {openTabs.length > 0 && (
          <div className="border-b border-neutral-100 px-5 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              {selected.size === 1 ? "Asking about this tab" : "Open Tabs"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {openTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                    selected.has(t.id) ? "border-blue bg-blue-soft text-blue" : "border-neutral-200 text-neutral-400",
                  )}
                >
                  <BrandIcon id={t.appId} size={11} /> {t.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <p className="text-sm text-neutral-400">
              Ask about what&apos;s happening across your open apps — STACK will look only at what you&apos;re authorized to see.
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" && "justify-end")}>
              <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm", m.role === "user" ? "bg-ink text-white" : "bg-neutral-50 text-ink")}>
                <p>{m.text}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
                    <CheckCircle2 size={11} className="text-blue" /> Sources: {m.sources.join(", ")}
                  </div>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-1 rounded-2xl bg-neutral-50 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-neutral-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2 border-t border-neutral-100 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selected.size > 1 ? "Ask about all Open Tabs..." : "Ask about this tab..."}
            className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-ink"
          />
          <button type="submit" disabled={!input.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white disabled:opacity-40">
            <Send size={14} />
          </button>
        </form>
      </motion.div>
    </>
  );
}
