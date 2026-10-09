"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check, ExternalLink, History, Loader2, Mic, MicOff, PanelRight, Paperclip, Plus, Sparkles, Trash2, X } from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { IntegrationLogo } from "@/components/brand-icons";
import { SyncNowButton } from "@/components/app/sync-now-button";
import { ActionCard, type PendingActionData } from "@/components/app/action-card";
import { AiAnswer } from "@/components/app/ai-answer";
import { ATTACHMENT_STORAGE_KEY, DEFAULT_SUGGESTIONS, getRecognition } from "@/components/app/ask-stack-bar";
import { useToast } from "@/components/app/toast";
import { providerLabel } from "@/lib/providers-meta";
import type { StructuredAnswer } from "@/lib/work-types";
import { cn } from "@/lib/utils";

interface Used {
  apps: string[];
  items: { type: string; label: string; href?: string }[];
}
interface Msg {
  id: string;
  role: "user" | "ai";
  text: string;
  structured?: StructuredAnswer;
  pendingActions?: (PendingActionData & { status?: string })[];
  used?: Used;
  steps?: string[];
  streaming?: boolean;
  error?: boolean;
}
interface ConversationRow {
  id: string;
  title: string;
  updatedAt: string;
}
interface Attachment {
  name: string;
  text: string;
}

const ITEM_GROUP: Record<string, string> = { task: "Tasks", message: "Messages", file: "Files", event: "Meetings", project: "Project" };

export default function AIPage() {
  return (
    <Suspense>
      <AIWorkspace />
    </Suspense>
  );
}

function AIWorkspace() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const projectId = searchParams.get("project") ?? undefined;
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const started = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);

  const scrollDown = useCallback(() => setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 40), []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) setConversations((await res.json()).conversations);
    } catch {
      // History is a convenience; the workspace still works without it.
    }
  }, []);

  const ask = useCallback(
    async (question: string, files: Attachment[] = []) => {
      const q = question.trim();
      if (!q || busy) return;
      const uid = `u${nextId.current++}`;
      const aid = `a${nextId.current++}`;
      const history = messages.filter((m) => !m.streaming && m.text).map((m) => ({ role: m.role, text: m.text })).slice(-8);
      setMessages((prev) => [...prev, { id: uid, role: "user", text: q }, { id: aid, role: "ai", text: "", streaming: true, steps: [] }]);
      setSelectedId(aid);
      setInput("");
      setAttachments([]);
      setBusy(true);
      scrollDown();
      const patch = (fn: (m: Msg) => Msg) => setMessages((prev) => prev.map((m) => (m.id === aid ? fn(m) : m)));

      try {
        const res = await fetch("/api/ai/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, history, projectId, conversationId: activeId, attachments: files, stream: true }),
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          patch((m) => ({ ...m, streaming: false, error: true, text: body.error || "Something went wrong asking STACK AI." }));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line);
            if (ev.type === "step") patch((m) => ({ ...m, steps: [...(m.steps ?? []), ev.label] }));
            else if (ev.type === "context") patch((m) => ({ ...m, used: ev.used }));
            else if (ev.type === "partial") {
              patch((m) => (m.streaming ? { ...m, text: ev.text } : m));
              scrollDown();
            }
            else if (ev.type === "answer") {
              patch((m) => ({ ...m, streaming: false, text: ev.answer, structured: ev.structured ?? undefined, pendingActions: ev.pendingActions, used: ev.used ?? m.used }));
              if (ev.conversationId) {
                setActiveId(ev.conversationId);
                loadHistory();
              }
            } else if (ev.type === "error") patch((m) => ({ ...m, streaming: false, error: true, text: ev.message }));
          }
        }
        patch((m) => (m.streaming ? { ...m, streaming: false, error: true, text: m.text || "The response ended early. Try again." } : m));
      } catch {
        patch((m) => ({ ...m, streaming: false, error: true, text: "Couldn't reach STACK AI. Check your connection and try again." }));
      } finally {
        setBusy(false);
        scrollDown();
      }
    },
    [activeId, busy, loadHistory, messages, projectId, scrollDown],
  );

  // First load: history, deep-linked conversation, or an auto-asked question (with any carried attachments).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      await loadHistory();
      setVoiceSupported(!!getRecognition());
      const c = searchParams.get("c");
      const q = searchParams.get("q");
      if (c) {
        await openConversation(c);
      } else if (q) {
        let files: Attachment[] = [];
        try {
          files = JSON.parse(sessionStorage.getItem(ATTACHMENT_STORAGE_KEY) ?? "[]");
          sessionStorage.removeItem(ATTACHMENT_STORAGE_KEY);
        } catch {
          files = [];
        }
        await ask(q, files);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openConversation(id: string) {
    setHistoryOpen(false);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) {
        toast({ title: "Couldn't open that conversation", tone: "error" });
        return;
      }
      const body = await res.json();
      const status: Record<string, string> = body.actionStatus ?? {};
      setActiveId(id);
      setMessages(
        body.messages.map((m: { id: string; role: "user" | "ai"; text: string; data?: { structured?: StructuredAnswer | null; used?: Used; pendingActions?: PendingActionData[] } | null }) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          structured: m.data?.structured ?? undefined,
          used: m.data?.used,
          pendingActions: m.data?.pendingActions?.map((a) => ({ ...a, status: status[a.id] })),
        })),
      );
      const lastAi = [...body.messages].reverse().find((m: { role: string }) => m.role === "ai");
      setSelectedId(lastAi?.id);
      scrollDown();
    } catch {
      toast({ title: "Couldn't open that conversation", tone: "error" });
    }
  }

  function newChat() {
    setActiveId(undefined);
    setMessages([]);
    setSelectedId(undefined);
    setHistoryOpen(false);
  }

  async function removeConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) newChat();
    fetch(`/api/conversations/${id}`, { method: "DELETE" }).catch(() => toast({ title: "Couldn't delete that conversation", tone: "error" }));
  }

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...attachments];
    for (const f of Array.from(list)) {
      if (next.length >= 3) break;
      if (!(f.type.startsWith("text/") || /\.(txt|md|csv|tsv|json|log|html?|xml|ya?ml|ics|eml)$/i.test(f.name))) {
        toast({ title: `Can't read ${f.name}`, description: "STACK reads text files. PDFs and images aren't supported yet.", tone: "error" });
        continue;
      }
      if (f.size > 200 * 1024) {
        toast({ title: `${f.name} is too large`, description: "The limit is 200 KB per file.", tone: "error" });
        continue;
      }
      next.push({ name: f.name, text: await f.text() });
    }
    setAttachments(next);
    if (fileRef.current) fileRef.current.value = "";
  }

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => setInput(Array.from(e.results).map((r) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast({ title: "Voice input stopped", description: "Check microphone permission.", tone: "error" });
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  const selected = messages.find((m) => m.id === selectedId && m.role === "ai") ?? [...messages].reverse().find((m) => m.role === "ai");
  const used = selected?.used;
  const grouped = Object.entries(
    (used?.items ?? []).reduce<Record<string, Used["items"]>>((acc, it) => {
      const g = ITEM_GROUP[it.type] ?? "Other";
      (acc[g] ??= []).push(it);
      return acc;
    }, {}),
  );

  const historyPane = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Conversations</p>
        <button onClick={newChat} className="flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"><Plus size={12} /> New</button>
      </div>
      <ul className="flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 && <li className="px-3 py-6 text-center text-xs text-neutral-400">Your conversations with STACK will appear here.</li>}
        {conversations.map((c) => (
          <li key={c.id} className="group relative">
            <button onClick={() => openConversation(c.id)} className={cn("w-full truncate rounded-lg px-3 py-2 pr-8 text-left text-sm", activeId === c.id ? "bg-neutral-100 font-medium text-ink" : "text-neutral-600 hover:bg-neutral-50")}>
              {c.title}
            </button>
            <button onClick={() => removeConversation(c.id)} aria-label={`Delete ${c.title}`} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-300 opacity-0 hover:text-red focus:opacity-100 group-hover:opacity-100"><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
    </div>
  );

  const contextPane = (
    <div className="h-full overflow-y-auto p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">STACK used</p>
      {!used ? (
        <p className="mt-3 text-sm text-neutral-400">Ask a question and STACK will show exactly which apps and items it used to answer.</p>
      ) : (
        <>
          <div className="mt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Connected apps</p>
            {used.apps.length === 0 ? (
              <p className="mt-1.5 text-sm text-neutral-500">No connected apps. This answer used only your STACK tasks and projects.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {used.apps.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm text-ink"><IntegrationLogo app={a} name={a} size="md" /> {providerLabel(a)}</li>
                ))}
              </ul>
            )}
          </div>
          {grouped.map(([group, items]) => (
            <div key={group} className="mt-5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{group}</p>
              <ul className="mt-1.5 space-y-1">
                {items.map((it) => (
                  <li key={`${group}${it.label}`}>
                    {it.href ? (
                      /^https?:|^slack:/.test(it.href) ? (
                        <a href={it.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-ink hover:underline"><span className="truncate">{it.label}</span><ExternalLink size={11} className="shrink-0 text-neutral-400" /></a>
                      ) : (
                        <Link href={it.href} className="block truncate text-sm text-ink hover:underline">{it.label}</Link>
                      )
                    ) : (
                      <span className="block truncate text-sm text-ink">{it.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {grouped.length === 0 && used.apps.length > 0 && <p className="mt-4 text-sm text-neutral-400">No specific items were cited for this answer.</p>}
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0">
      <aside aria-label="Conversation history" className="hidden w-60 shrink-0 border-r border-neutral-100 bg-white lg:block">{historyPane}</aside>

      <section aria-label="Conversation" className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-2 lg:border-0">
          <div className="flex items-center gap-1 lg:hidden">
            <button onClick={() => setHistoryOpen(true)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100"><History size={14} /> History</button>
          </div>
          <p className="hidden truncate text-xs font-medium tracking-wide text-neutral-400 lg:block">{projectId ? "Asking about one project" : "Understand · Prioritize · Act · Move Forward"}</p>
          <div className="flex items-center gap-1">
            <SyncNowButton />
            <button onClick={() => setContextOpen(true)} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 xl:hidden"><PanelRight size={14} /> Sources</button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-8">
          <div className="mx-auto max-w-2xl py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center sm:py-20">
                <LogoIcon size={40} />
                <h1 className="mt-4 text-2xl font-semibold text-ink">Ask STACK about your work</h1>
                <p className="mt-1.5 max-w-md text-neutral-500">STACK reads the apps you&apos;ve connected, works out what matters, and proposes the next step. It shows what it used, and asks before it changes anything.</p>
                <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
                  {DEFAULT_SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => ask(s)} className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-left text-sm text-neutral-600 transition-colors hover:border-ink hover:text-ink">{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6" aria-live="polite">
                {messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
                    {m.role === "ai" && (
                      <button onClick={() => { setSelectedId(m.id); setContextOpen(true); }} aria-label="Show what STACK used for this answer" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-blue"><Sparkles size={14} /></button>
                    )}
                    <div className={cn("min-w-0 rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "max-w-md bg-ink text-white" : cn("max-w-full flex-1 bg-white ring-1 ring-neutral-100", selected?.id === m.id && "ring-neutral-200"))}>
                      {m.streaming ? (
                        <>
                          <ul className="space-y-1.5" aria-label="STACK is working">
                            {(m.steps?.length ? m.steps : ["Reading your work"]).map((s, i, arr) => (
                              <li key={`${s}${i}`} className={cn("flex items-center gap-2 text-sm", i === arr.length - 1 ? "text-ink" : "text-neutral-400")}>
                                {i === arr.length - 1 ? <Loader2 size={13} className="animate-spin text-blue" /> : <Check size={13} className="text-green" />} {s}
                              </li>
                            ))}
                          </ul>
                          {m.text && (
                            <p className="mt-3 whitespace-pre-wrap text-ink">
                              {m.text}
                              <span aria-hidden className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-neutral-300" />
                            </p>
                          )}
                        </>
                      ) : m.structured ? (
                        <AiAnswer answer={m.structured} />
                      ) : (
                        <p className={cn(m.error && "text-red")}>{m.text}</p>
                      )}
                      {m.pendingActions?.map((a) => <ActionCard key={a.id} action={a} status={a.status} />)}
                    </div>
                  </motion.div>
                ))}
                <div ref={scrollRef} />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-neutral-100 bg-white/80 px-4 py-3 backdrop-blur sm:px-8">
          <form onSubmit={(e) => { e.preventDefault(); ask(input, attachments); }} className="mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-neutral-300">
            {attachments.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 px-2 pb-1.5 pt-1">
                {attachments.map((f) => (
                  <li key={f.name} className="flex items-center gap-1.5 rounded-lg bg-neutral-100 py-1 pl-2.5 pr-1.5 text-xs text-neutral-600"><Paperclip size={11} /> {f.name}
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setAttachments((p) => p.filter((x) => x.name !== f.name))} className="rounded p-0.5 hover:text-ink"><X size={11} /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-1 pl-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? "Listening..." : "Ask STACK about your work..."} aria-label="Message STACK" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
              <input ref={fileRef} type="file" multiple className="sr-only" tabIndex={-1} accept=".txt,.md,.csv,.tsv,.json,.log,.html,.xml,.yaml,.yml,.ics,.eml,text/*" onChange={(e) => addFiles(e.target.files)} />
              <button type="button" onClick={() => fileRef.current?.click()} aria-label="Attach a text file" className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-ink"><Paperclip size={16} /></button>
              {voiceSupported && (
                <button type="button" onClick={toggleVoice} aria-pressed={listening} aria-label={listening ? "Stop voice input" : "Speak your question"} className={cn("flex h-9 w-9 items-center justify-center rounded-xl", listening ? "bg-red-soft text-red" : "text-neutral-400 hover:bg-neutral-100 hover:text-ink")}>
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
              <button type="submit" disabled={!input.trim() || busy} aria-label="Send" className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white disabled:opacity-30"><ArrowUp size={16} /></button>
            </div>
          </form>
        </div>
      </section>

      <aside aria-label="What STACK used" className="hidden w-72 shrink-0 border-l border-neutral-100 bg-white xl:block">{contextPane}</aside>

      <AnimatePresence>
        {(historyOpen || contextOpen) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/40 xl:hidden" onClick={() => { setHistoryOpen(false); setContextOpen(false); }}>
            <motion.div
              initial={{ x: historyOpen ? -300 : 300 }}
              animate={{ x: 0 }}
              exit={{ x: historyOpen ? -300 : 300 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className={cn("absolute top-0 h-full w-[min(20rem,88vw)] bg-white shadow-xl", historyOpen ? "left-0" : "right-0")}
            >
              <button onClick={() => { setHistoryOpen(false); setContextOpen(false); }} aria-label="Close" className="absolute right-2 top-2 z-10 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100"><X size={16} /></button>
              {historyOpen ? historyPane : contextPane}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
