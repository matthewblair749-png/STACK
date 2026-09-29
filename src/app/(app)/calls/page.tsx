"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/app/toast";
import { cn } from "@/lib/utils";

interface CallRow {
  id: string;
  title: string | null;
  status: "Active" | "Ended";
  startedAt: string;
  endedAt: string | null;
  hostName: string;
  activeCount: number;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function CallsPage() {
  const router = useRouter();
  const toast = useToast();
  const [calls, setCalls] = useState<CallRow[] | null>(null);
  const [starting, setStarting] = useState(false);

  async function load() {
    const res = await fetch("/api/calls");
    if (res.ok) setCalls((await res.json()).calls);
  }

  useEffect(() => {
    queueMicrotask(load);
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  async function startCall() {
    setStarting(true);
    try {
      const res = await fetch("/api/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't start a call.");
      router.push(`/call/${body.call.id}`);
    } catch (err) {
      toast({ title: "Couldn't start a call", description: err instanceof Error ? err.message : undefined, tone: "error" });
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Calls</h1>
          <p className="mt-1 text-neutral-500">Video calls with your team, built into STACK. No download, no separate account.</p>
        </div>
        <button
          onClick={startCall}
          disabled={starting}
          className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {starting ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
          Start a call
        </button>
      </div>

      <div className="mt-8">
        {calls === null ? (
          <div className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />)}
          </div>
        ) : calls.length === 0 ? (
          <Card className="text-center">
            <Video size={28} className="mx-auto text-neutral-300" />
            <p className="mt-3 text-sm font-medium text-ink">No calls yet</p>
            <p className="mt-1 text-sm text-neutral-400">Start one and share the link - anyone in this workspace can join from their browser.</p>
          </Card>
        ) : (
          <Card className="p-0">
            {calls.map((c) => (
              <div key={c.id} className="flex items-center gap-3 border-b border-neutral-50 px-5 py-3.5 last:border-0">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", c.status === "Active" ? "bg-green-soft text-green" : "bg-neutral-100 text-neutral-400")}>
                  <Video size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.title || `${c.hostName}'s call`}</p>
                  <p className="truncate text-xs text-neutral-400">
                    Started by {c.hostName} · {timeAgo(c.startedAt)}
                    {c.status === "Active" && c.activeCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-neutral-500"><Users size={11} className="inline" /> {c.activeCount}</span>
                    )}
                  </p>
                </div>
                {c.status === "Active" ? (
                  <button onClick={() => router.push(`/call/${c.id}`)} className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                    Join
                  </button>
                ) : (
                  <Badge accent="neutral">Ended</Badge>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
