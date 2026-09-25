"use client";

import { AlertTriangle, Check, CheckCircle2, Circle, Loader2, RefreshCw, X } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { relativeTime } from "@/components/app/home-parts";
import { providerLabel } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import { healthLabel, healthMessage, type CatalogApp, type QueueItem } from "./types";

const TONE = {
  ok: "bg-green-soft text-green",
  warn: "bg-yellow-soft text-yellow-700",
  bad: "bg-red-soft text-red",
  info: "bg-blue-soft text-blue",
  muted: "bg-neutral-100 text-neutral-500",
} as const;

export function StatusChip({ app, syncing }: { app: CatalogApp; syncing: boolean }) {
  const h = healthLabel(app, syncing);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", TONE[h.tone])}>
      {h.tone === "ok" && <Check size={11} />}
      {h.tone === "info" && syncing && <Loader2 size={11} className="animate-spin" />}
      {(h.tone === "warn" || h.tone === "bad") && <AlertTriangle size={11} />}
      {h.text}
    </span>
  );
}

/** What the tile's button does, honestly, for every state an app can really be in. */
export function primaryAction(app: CatalogApp): { label: string; kind: "connect" | "setup" | "reconnect" | "manage" | "none"; reason?: string } {
  if (app.connected) return app.health === "expired" ? { label: "Reconnect", kind: "reconnect" } : { label: "Manage", kind: "manage" };
  if (!app.supported) {
    if (app.authType === "DesktopApp") return { label: "Desktop app", kind: "none", reason: "Local software - there's no cloud account for STACK to authorize." };
    if (app.authType === "Unavailable") return { label: "Unavailable", kind: "none", reason: "This product has no public API for STACK to connect to." };
    return { label: "Coming soon", kind: "none", reason: "STACK doesn't have a connector for this app yet." };
  }
  if (!app.configured) return { label: "Set up", kind: "setup" };
  return { label: "Connect", kind: "connect" };
}

export function AppTile({ app, syncing, reason, onOpen, onAction }: { app: CatalogApp; syncing: boolean; reason?: string; onOpen: () => void; onAction: () => void }) {
  const action = primaryAction(app);
  return (
    <div className="group flex flex-col rounded-2xl border border-neutral-100 bg-white p-4 transition-shadow hover:shadow-sm">
      <button onClick={onOpen} className="flex items-start gap-3 text-left" aria-label={`${app.name} details`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-50">
          <IntegrationLogo app={app.oauthProviderId ?? app.slug} name={app.name} size="md" logoPath={app.logoPath} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{app.name}</span>
          <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-500">{app.description}</span>
        </span>
      </button>
      {reason && <p className="mt-2 text-[11px] text-blue">{reason}</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        {app.connected ? <StatusChip app={app} syncing={syncing} /> : <span className="truncate text-[11px] text-neutral-400">{app.category}</span>}
        <button
          onClick={onAction}
          disabled={action.kind === "none" || syncing}
          title={action.reason}
          className={cn(
            "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default",
            action.kind === "connect" || action.kind === "setup" || action.kind === "reconnect" ? "bg-ink text-white hover:bg-neutral-800" : "border border-neutral-200 text-ink hover:border-ink",
            action.kind === "none" && "border-transparent bg-neutral-50 text-neutral-400 hover:border-transparent",
          )}
        >
          {action.label}
        </button>
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-5">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{title}</p>
    {children}
  </div>
);

export function AppDrawer({
  app,
  syncing,
  siblings,
  onClose,
  onAction,
  onSync,
  onDisconnect,
}: {
  app: CatalogApp;
  syncing: boolean;
  /** Other catalog apps that share this app's sign-in (Gmail, Calendar and Drive all use Google). */
  siblings: string[];
  onClose: () => void;
  onAction: () => void;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const action = primaryAction(app);
  const msg = healthMessage(app);
  const meta = app.meta;
  const provider = app.oauthProviderId ? providerLabel(app.oauthProviderId) : app.name;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/25" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${app.name} details`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-50">
              <IntegrationLogo app={app.oauthProviderId ?? app.slug} name={app.name} size="md" logoPath={app.logoPath} />
            </span>
            <div>
              <p className="text-lg font-semibold text-ink">{app.name}</p>
              <p className="text-xs text-neutral-500">{app.category}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"><X size={18} /></button>
        </div>

        <p className="mt-4 text-sm text-neutral-600">{app.description}</p>
        {app.connected && (
          <div className="mt-3 flex items-center gap-2">
            <StatusChip app={app} syncing={syncing} />
            {app.lastSyncAt && !syncing && <span className="text-xs text-neutral-400">Last synced {relativeTime(app.lastSyncAt)}</span>}
          </div>
        )}
        {msg && <p className={cn("mt-3 rounded-lg px-3 py-2 text-sm", app.health === "expired" ? "bg-red-soft text-red" : "bg-yellow-soft text-yellow-700")}>{msg}</p>}
        {app.connected && siblings.length > 0 && <p className="mt-3 text-xs text-neutral-500">Connected through {provider}, which also covers {siblings.join(", ")}.</p>}

        {meta ? (
          <>
            <Section title={`${app.name} helps STACK understand`}>
              <ul className="mt-2 space-y-1.5">{meta.understands.map((u) => <li key={u} className="flex items-start gap-2 text-sm text-ink"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-blue" /> {u}</li>)}</ul>
            </Section>
            {app.account && <Section title="Connected account"><p className="mt-1 text-sm text-ink">{app.account}</p></Section>}
            <Section title="Access (read)">
              <ul className="mt-2 space-y-1">{meta.read.map((r) => <li key={r} className="text-sm text-ink">{r}</li>)}</ul>
            </Section>
            <Section title="Actions">
              {meta.act.length > 0 ? (
                <>
                  <ul className="mt-2 space-y-1">{meta.act.map((r) => <li key={r} className="text-sm text-ink">{r} <span className="text-xs text-neutral-400">- with your approval</span></li>)}</ul>
                  {meta.actNote && <p className="mt-1 text-xs text-neutral-500">{meta.actNote}</p>}
                </>
              ) : (
                <p className="mt-2 text-sm text-neutral-600">Read-only for now. STACK can&apos;t change anything in {app.name}.</p>
              )}
            </Section>
            <Section title="STACK will not">
              <ul className="mt-2 space-y-1">{meta.wont.map((r) => <li key={r} className="flex items-start gap-2 text-sm text-ink"><X size={13} className="mt-1 shrink-0 text-red" /> {r}</li>)}</ul>
            </Section>
            {app.connected && app.counts && (
              <Section title="Data">
                <p className="mt-2 text-sm text-ink">
                  {app.counts.messages + app.counts.events + app.counts.files === 0
                    ? "Nothing imported yet."
                    : [app.counts.messages && `${app.counts.messages} messages`, app.counts.events && `${app.counts.events} events`, app.counts.files && `${app.counts.files} files`].filter(Boolean).join(" - ")}
                </p>
              </Section>
            )}
          </>
        ) : (
          <p className="mt-5 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">{action.reason}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {action.kind !== "none" && !(app.connected && app.health !== "expired") && (
            <button onClick={onAction} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">{action.label}</button>
          )}
          {app.connected && (
            <>
              <button onClick={onSync} disabled={syncing} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-ink hover:border-ink disabled:opacity-50">
                <RefreshCw size={14} className={syncing ? "animate-spin" : undefined} /> Sync now
              </button>
              {app.health !== "expired" && <button onClick={onAction} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-ink hover:border-ink">Reconnect</button>}
              <button onClick={onDisconnect} className="rounded-lg px-4 py-2 text-sm font-semibold text-red hover:bg-red-soft">Disconnect</button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

const QUEUE_ICON = {
  waiting: <Circle size={14} className="text-neutral-300" />,
  connecting: <Loader2 size={14} className="animate-spin text-blue" />,
  syncing: <Loader2 size={14} className="animate-spin text-blue" />,
  done: <CheckCircle2 size={14} className="text-green" />,
  failed: <AlertTriangle size={14} className="text-red" />,
  skipped: <Circle size={14} className="text-neutral-300" />,
} as const;

const QUEUE_TEXT = { waiting: "Waiting", connecting: "Authorize on the next page...", syncing: "Syncing...", done: "Connected", failed: "Needs attention", skipped: "Skipped" } as const;

/** Live queue for "Connect all". Every state here comes from the real OAuth return and the real sync result. */
export function QueuePanel({ items, paused, onPause, onResume, onDismiss }: { items: QueueItem[]; paused: boolean; onPause: () => void; onResume: () => void; onDismiss: () => void }) {
  const active = items.some((i) => i.state === "waiting" || i.state === "connecting" || i.state === "syncing");
  return (
    <div className="mt-6 rounded-2xl border border-neutral-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">{active ? "Connecting your work..." : "Connection summary"}</p>
        <div className="flex items-center gap-2">
          {active && (paused ? <button onClick={onResume} className="text-xs font-semibold text-blue">Resume</button> : <button onClick={onPause} className="text-xs font-semibold text-neutral-500 hover:text-ink">Pause</button>)}
          {!active && <button onClick={onDismiss} className="text-xs font-semibold text-neutral-500 hover:text-ink">Dismiss</button>}
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i.provider} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5">{QUEUE_ICON[i.state]}</span>
            <span className="min-w-0">
              <span className="font-medium text-ink">{i.name}</span>{" "}
              <span className={cn("text-xs", i.state === "failed" ? "text-red" : "text-neutral-500")}>{i.detail ?? QUEUE_TEXT[i.state]}</span>
            </span>
          </li>
        ))}
      </ul>
      {active && <p className="mt-3 text-xs text-neutral-400">Each app asks you to approve access on its own page - STACK never skips that step.</p>}
    </div>
  );
}
