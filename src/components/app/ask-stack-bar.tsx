"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Mic, MicOff, Paperclip, Search, Sparkles, X } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { cn } from "@/lib/utils";
import { useToast } from "./toast";

export const DEFAULT_SUGGESTIONS = [
  "What should I work on?",
  "Catch me up",
  "Prepare my next meeting",
  "What's blocking my projects?",
  "What am I waiting on?",
  "Find the latest proposal",
];

export const ATTACHMENT_STORAGE_KEY = "stack-ai-attachments";
const MAX_FILE_BYTES = 200 * 1024;
const MAX_FILES = 3;
const TEXT_TYPES = /\.(txt|md|markdown|csv|tsv|json|log|html?|xml|ya?ml|ics|eml)$/i;

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type RecognitionCtor = new () => RecognitionLike;

export function getRecognition(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * STACK's command bar: natural language in, straight into the AI workspace. Supports voice (browser
 * speech recognition, only shown when the browser has it), text-file attachments, jumping to
 * global search, and keyboard shortcuts (/ and Cmd/Ctrl+J focus it from anywhere on the page).
 */
export function AskStackBar({
  suggestions = DEFAULT_SUGGESTIONS,
  shortcuts = true,
  autoFocus = false,
  onSubmitted,
}: {
  suggestions?: string[];
  shortcuts?: boolean;
  autoFocus?: boolean;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { setCommandOpen } = useDemo();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<{ name: string; text: string }[]>([]);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setVoiceSupported(!!getRecognition());
    });
    return () => {
      cancelled = true;
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!shortcuts) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const submit = useCallback(
    (question?: string) => {
      const q = (question ?? value).trim();
      try {
        if (files.length) sessionStorage.setItem(ATTACHMENT_STORAGE_KEY, JSON.stringify(files));
        else sessionStorage.removeItem(ATTACHMENT_STORAGE_KEY);
      } catch {
        toast({ title: "Attachments couldn't be carried over", description: "Try attaching them again in the AI workspace.", tone: "error" });
      }
      router.push(q ? `/ai?q=${encodeURIComponent(q)}` : "/ai");
      onSubmitted?.();
    },
    [files, onSubmitted, router, toast, value],
  );

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        toast({ title: `Attach up to ${MAX_FILES} files`, tone: "info" });
        break;
      }
      if (!(file.type.startsWith("text/") || TEXT_TYPES.test(file.name))) {
        toast({ title: `Can't read ${file.name}`, description: "STACK reads text files (.txt, .md, .csv, .json). PDFs and images aren't supported yet.", tone: "error" });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast({ title: `${file.name} is too large`, description: "The limit is 200 KB per file.", tone: "error" });
        continue;
      }
      next.push({ name: file.name, text: await file.text() });
    }
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setValue(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast({ title: "Voice input stopped", description: "Check that the browser has microphone permission.", tone: "error" });
    };
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "rounded-[22px] border bg-white p-2 transition-shadow duration-200",
          focused ? "border-neutral-300 shadow-[0_10px_40px_-14px_rgba(0,0,0,0.22)]" : "border-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        )}
      >
        <div className="flex items-center gap-2 pl-3">
          <Sparkles size={18} className="shrink-0 text-blue" aria-hidden />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={listening ? "Listening..." : "Ask STACK anything about your work..."}
            aria-label="Ask STACK anything about your work"
            className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-neutral-400"
          />
          <kbd className="hidden shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500 md:inline">/</kbd>
          <div className="flex shrink-0 items-center gap-0.5">
            <input ref={fileRef} type="file" multiple accept=".txt,.md,.markdown,.csv,.tsv,.json,.log,.html,.xml,.yaml,.yml,.ics,.eml,text/*" className="sr-only" tabIndex={-1} onChange={(e) => addFiles(e.target.files)} />
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Attach a text file" title="Attach a text file" className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-ink">
              <Paperclip size={16} />
            </button>
            <button type="button" onClick={() => setCommandOpen(true)} aria-label="Search everything" title="Search everything (Ctrl/Cmd+K)" className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-ink">
              <Search size={16} />
            </button>
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={listening ? "Stop voice input" : "Speak your question"}
                aria-pressed={listening}
                title={listening ? "Stop voice input" : "Speak your question"}
                className={cn("flex h-9 w-9 items-center justify-center rounded-xl", listening ? "bg-red-soft text-red" : "text-neutral-400 hover:bg-neutral-100 hover:text-ink")}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <button type="submit" aria-label="Ask STACK" className="ml-1 flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white transition-transform hover:scale-105 active:scale-95">
              <ArrowUp size={17} />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {files.length > 0 && (
            <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-1.5 overflow-hidden px-3 pb-1 pt-1.5">
              {files.map((f) => (
                <li key={f.name} className="flex items-center gap-1.5 rounded-lg bg-neutral-100 py-1 pl-2.5 pr-1.5 text-xs text-neutral-600">
                  <Paperclip size={11} /> {f.name}
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))} className="rounded p-0.5 text-neutral-400 hover:text-ink">
                    <X size={11} />
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </form>

      <div className="mt-3 flex flex-wrap gap-2" role="list" aria-label="Suggested questions">
        {suggestions.map((s) => (
          <button
            key={s}
            role="listitem"
            onClick={() => submit(s)}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:border-ink hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
