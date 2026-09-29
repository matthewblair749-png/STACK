"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, Building2, CheckSquare, Home, FolderKanban, Inbox, Calendar, Files, MessageSquare, Sparkles, Search,
  User, CornerDownLeft, Loader2, Users, Plug,
} from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { useDemo } from "@/lib/demo-context";
import type { SearchResponse, SearchResult, SearchResultType } from "@/lib/work-types";
import { cn } from "@/lib/utils";

const GROUPS: { type: SearchResultType; label: string }[] = [
  { type: "project", label: "Projects" },
  { type: "task", label: "Tasks" },
  { type: "email", label: "Emails" },
  { type: "message", label: "Messages" },
  { type: "file", label: "Files" },
  { type: "meeting", label: "Meetings" },
  { type: "person", label: "People" },
  { type: "company", label: "Companies" },
  { type: "app", label: "Connected apps" },
];

const TYPE_ICON: Partial<Record<SearchResultType, typeof Search>> = {
  task: CheckSquare, project: FolderKanban, person: User, company: Building2, email: Inbox, message: MessageSquare, file: Files, meeting: Calendar, app: Plug,
};

const GO_TO: { label: string; href: string; icon: typeof Search }[] = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "My Work", href: "/tasks", icon: CheckSquare },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Files", href: "/files", icon: Files },
  { label: "Conversations", href: "/messages", icon: MessageSquare },
  { label: "Updates", href: "/updates", icon: Bell },
  { label: "STACK AI", href: "/ai", icon: Sparkles },
  { label: "Team", href: "/team", icon: Users },
];

interface Row {
  key: string;
  render: () => React.ReactNode;
  run: () => void;
}

function Glyph({ result }: { result: SearchResult }) {
  if (result.appId) return <IntegrationLogo app={result.appId} name={result.appId} size="md" />;
  const Icon = TYPE_ICON[result.type] ?? Search;
  return <Icon size={17} className="text-neutral-400" />;
}

/**
 * Global search and command palette (Ctrl/Cmd+K). Searches what STACK actually holds - tasks,
 * projects, people, synced email/chat/files/meetings, companies, connected apps - and any
 * question can be handed straight to the AI. Fully keyboard-driven.
 */
export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setCommandOpen(false);
    setQuery("");
    setData(null);
    setActive(0);
  }, [setCommandOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (commandOpen) close();
        else setCommandOpen(true);
      }
      if (e.key === "Escape" && commandOpen) close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, setCommandOpen, close]);

  useEffect(() => {
    if (commandOpen) inputRef.current?.focus();
  }, [commandOpen]);

  // Debounced, cancellable search.
  useEffect(() => {
    const q = query.trim();
    if (!commandOpen || q.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          setData(await res.json());
          setActive(0);
        }
      } catch {
        // Aborted or offline - keep the previous results.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 140);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, commandOpen]);

  const go = useCallback(
    (href: string, external?: boolean) => {
      close();
      if (external) window.open(href, "_blank", "noopener,noreferrer");
      else router.push(href);
    },
    [close, router],
  );

  const q = query.trim();
  const showResults = q.length >= 2 && data?.query === q;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const askRow = (label: string): Row => ({
      key: "ask",
      run: () => go(`/ai?q=${encodeURIComponent(q)}`),
      render: () => (
        <>
          <Sparkles size={17} className="shrink-0 text-blue" />
          <span className="min-w-0 flex-1 truncate text-sm text-ink">{label}</span>
          <span className="text-xs text-neutral-400">Ask STACK</span>
        </>
      ),
    });
    if (q.length < 2) {
      for (const g of GO_TO) {
        out.push({
          key: g.href,
          run: () => go(g.href),
          render: () => (
            <>
              <g.icon size={17} className="shrink-0 text-neutral-400" />
              <span className="flex-1 text-sm text-ink">{g.label}</span>
              <span className="text-xs text-neutral-400">Go to</span>
            </>
          ),
        });
      }
      return out;
    }
    if (data?.ask && showResults) out.push(askRow(`Ask STACK: ${data.ask}`));
    if (showResults) {
      for (const g of GROUPS) {
        for (const r of data!.results.filter((x) => x.type === g.type)) {
          out.push({
            key: `${r.type}:${r.id}`,
            run: () => (r.href ? go(r.href, r.external) : undefined),
            render: () => (
              <>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-50">
                  <Glyph result={r} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{r.title}</span>
                  {r.subtitle && <span className="block truncate text-xs text-neutral-400">{r.subtitle}</span>}
                </span>
                <span className="shrink-0 text-[11px] uppercase tracking-wide text-neutral-300">{g.label.replace(/s$/, "")}</span>
              </>
            ),
          });
        }
      }
    }
    if (!(data?.ask && showResults)) out.push(askRow(`Ask STACK about "${q}"`));
    return out;
  }, [q, data, showResults, go]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      rows[active]?.run();
    }
  }

  const noResults = showResults && data!.results.length === 0;

  return (
    <AnimatePresence>
      {commandOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[10vh] backdrop-blur-[2px]"
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search everything"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4">
              {loading ? <Loader2 size={17} className="shrink-0 animate-spin text-neutral-400" /> : <Search size={17} className="shrink-0 text-neutral-400" />}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search people, messages, files, projects... or ask a question"
                aria-label="Search"
                role="combobox"
                aria-expanded
                aria-controls="palette-list"
                className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-neutral-400"
              />
              <kbd className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">esc</kbd>
            </div>

            <div ref={listRef} id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
              {q.length < 2 && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Go to</p>}
              {rows.map((row, i) => (
                <button
                  key={row.key}
                  data-row={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={row.run}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left", i === active ? "bg-neutral-100" : "hover:bg-neutral-50")}
                >
                  {row.render()}
                  {i === active && <CornerDownLeft size={13} className="shrink-0 text-neutral-300" />}
                </button>
              ))}
              {noResults && <p className="px-3 py-3 text-sm text-neutral-400">Nothing in your connected data matches &ldquo;{q}&rdquo;. Try asking STACK instead.</p>}
              {q.length >= 2 && !showResults && !loading && <p className="px-3 py-2 text-xs text-neutral-400">Searching...</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
