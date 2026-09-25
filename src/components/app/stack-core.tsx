"use client";

import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { LogoMark } from "@/components/logo";
import { providerLabel } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import { relativeTime } from "./home-parts";

interface CoreApp {
  id: string;
  name: string;
  logoPath?: string | null;
  status?: string;
}

interface Issue {
  provider: string;
  error: string;
}

const STAGES = ["Understand", "Prioritize", "Act", "Move Forward"];

type Health = "syncing" | "error" | "waiting" | "live";

/**
 * Shows, honestly, how STACK is connected: which apps are linked, whether they are syncing right now,
 * when they last synced, and - if something is wrong - exactly what. Data only flows along the lines
 * (and the dots only move) when a sync has actually worked.
 */
export function StackCore({
  apps,
  syncing,
  lastSyncAt,
  hasContent,
  issues,
  onSync,
}: {
  apps: CoreApp[];
  syncing: boolean;
  lastSyncAt?: string;
  hasContent: boolean;
  issues: Issue[];
  onSync: () => void;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 80, damping: 16 });
  const sy = useSpring(py, { stiffness: 80, damping: 16 });
  const tilt = useTransform(sx, [-1, 1], [-8, 8]);
  const lift = useTransform(sy, [-1, 1], [6, -6]);
  const shown = apps.slice(0, 6);

  const issueFor = (id: string) => issues.find((i) => i.provider === id);
  const anyIssue = issues.length > 0 || apps.some((a) => a.status === "error");
  const health: Health = syncing ? "syncing" : anyIssue ? "error" : lastSyncAt ? "live" : "waiting";
  const flowing = (health === "live" || health === "syncing") && !reduce;

  const line = cn("relative h-px min-w-6 flex-1", health === "error" ? "border-t border-dashed border-red/50 bg-transparent" : "bg-neutral-200");
  const names = shown.map((a) => providerLabel(a.id)).join(", ");

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[20px] border border-neutral-100 bg-white p-4 sm:p-5"
      onPointerMove={(e) => {
        if (reduce || e.pointerType === "touch") return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        px.set(((e.clientX - r.left) / r.width) * 2 - 1);
        py.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Connected</p>
        <p className="flex items-center gap-1.5 text-xs">
          {health === "syncing" && (<><Loader2 size={13} className="animate-spin text-blue" /><span className="font-medium text-blue">Syncing now...</span></>)}
          {health === "live" && (<><CheckCircle2 size={13} className="text-green" /><span className="font-medium text-green">Live</span><span className="text-neutral-400">{lastSyncAt ? `synced ${relativeTime(lastSyncAt)}` : ""}</span></>)}
          {health === "waiting" && (<><span className="h-2 w-2 rounded-full bg-yellow" /><span className="font-medium text-neutral-600">Connected, waiting for first sync</span></>)}
          {health === "error" && (<><AlertTriangle size={13} className="text-red" /><span className="font-medium text-red">Connected, but sync failed</span></>)}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3" style={{ perspective: 600 }}>
        <ul className="flex shrink-0 items-center gap-2">
          {shown.map((a) => {
            const bad = !!issueFor(a.id) || a.status === "error";
            return (
              <li key={a.id} title={`${providerLabel(a.id)} - ${bad ? "sync failed" : "connected"}`} className="relative">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
                  <IntegrationLogo app={a.id} name={a.name} size="md" logoPath={a.logoPath} />
                </span>
                <span className={cn("absolute -bottom-1 -right-1 h-3 w-3 rounded-full ring-2 ring-white", bad ? "bg-red" : syncing ? "animate-pulse bg-blue" : lastSyncAt ? "bg-green" : "bg-yellow")} aria-hidden />
              </li>
            );
          })}
          {apps.length > shown.length && <li className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-500">+{apps.length - shown.length}</li>}
        </ul>

        <div className={line} aria-hidden>
          {flowing && [0, 1, 2].map((i) => <span key={i} className="stack-flow-dot" style={{ animationDelay: `${i * 0.7}s` }} />)}
        </div>

        <motion.div style={{ rotateY: reduce ? 0 : tilt, rotateX: reduce ? 0 : lift }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-white shadow-[0_10px_24px_-8px_rgba(0,0,0,0.5)]">
          <LogoMark size={22} animate={flowing} className="text-white" />
        </motion.div>

        <div className={cn(line, "hidden sm:block")} aria-hidden>
          {flowing && hasContent && [0, 1].map((i) => <span key={i} className="stack-flow-dot" style={{ animationDelay: `${i * 0.9 + 0.3}s` }} />)}
        </div>

        <ol className="hidden shrink-0 items-center gap-1 sm:flex">
          {STAGES.map((s, i) => (
            <li key={s} className="flex items-center gap-1">
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", hasContent && health !== "error" ? "bg-ink text-white" : "bg-neutral-100 text-neutral-500")}>{s}</span>
              {i < STAGES.length - 1 && <span className="text-neutral-300" aria-hidden>&rsaquo;</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
        <p className="min-w-0 text-sm text-neutral-600">
          {health === "error" ? (
            <>
              <span className="font-medium text-ink">{names} {shown.length === 1 ? "is" : "are"} connected</span>
              {" "}but couldn&apos;t sync: {(issues[0]?.error ?? "the connection needs attention.").slice(0, 220)}
            </>
          ) : health === "waiting" ? (
            <><span className="font-medium text-ink">{names} connected.</span> STACK hasn&apos;t pulled anything in yet.</>
          ) : health === "syncing" ? (
            <><span className="font-medium text-ink">{names} connected.</span> Reading your latest work...</>
          ) : hasContent ? (
            <><span className="font-medium text-ink">{names} connected.</span> STACK is reading your work and keeping it up to date.</>
          ) : (
            <><span className="font-medium text-ink">{names} connected</span> and synced, but there&apos;s nothing recent to show yet.</>
          )}
        </p>
        <button onClick={onSync} disabled={syncing} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink disabled:opacity-50">
          <RefreshCw size={12} className={syncing ? "animate-spin" : undefined} /> {health === "error" ? "Sync again" : "Sync now"}
        </button>
      </div>
    </div>
  );
}
