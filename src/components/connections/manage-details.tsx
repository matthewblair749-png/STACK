"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Loader2, Trash2 } from "lucide-react";
import { relativeTime } from "@/components/app/home-parts";
import { cn } from "@/lib/utils";
import { Modal } from "./dialogs";
import type { CatalogApp } from "./types";

interface Details {
  connected: boolean;
  connectedAt: string | null;
  account: string | null;
  method: "oauth" | "token" | null;
  grantedScopes: string[];
  lastSyncAttemptAt: string | null;
  problem: string | null;
  jobs: { status: "Queued" | "Running" | "Succeeded" | "Failed"; reason: string; attempts: number; createdAt: string; finishedAt: string | null; lastError: string | null }[];
  history: { action: string; at: string; detail: Record<string, unknown> }[];
  retention: { messageDays: number; maxMessagesPerConnection: number; maxFilesPerConnection: number };
}

const REASON: Record<string, string> = { connect: "After connecting", manual: "Sync now", schedule: "Daily sync", webhook: "Live update" };

const Title = ({ children }: { children: React.ReactNode }) => <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{children}</p>;

function removedText(detail: Record<string, unknown>) {
  const r = detail.removed as { messages?: number; events?: number; files?: number; tasks?: number } | undefined;
  if (!r) return "";
  const n = (r.messages ?? 0) + (r.events ?? 0) + (r.files ?? 0) + (r.tasks ?? 0);
  return ` - ${n} item${n === 1 ? "" : "s"} removed`;
}

function historyLabel(h: Details["history"][number]) {
  switch (h.action) {
    case "integration.connected":
      return h.detail.method === "token" ? "Connected with your own token" : "Connected";
    case "integration.disconnected":
      if (h.detail.byAdmin) return `Disconnected by a workspace admin${removedText(h.detail)}`;
      return `Disconnected${h.detail.revoked ? " and access revoked" : ""}${removedText(h.detail)}`;
    case "integration.data_deleted":
      return `Synced data deleted${removedText(h.detail)}`;
    default:
      return h.action.replace("integration.", "").replace(/_/g, " ");
  }
}

/**
 * The "manage connection" part of an app's drawer: the account and permissions actually granted, recent sync runs,
 * history, and deleting STACK's synced copies without disconnecting. Loaded only when the drawer is open.
 */
export function ManageDetails({ app, onDataDeleted }: { app: CatalogApp; onDataDeleted: (message: string) => void }) {
  const provider = app.oauthProviderId!;
  const [details, setDetails] = useState<Details | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Bumped to re-read after a change (e.g. data deleted); a new sync also re-reads via app.lastSyncAt.
  const [version, setVersion] = useState(0);
  const reload = () => {
    setFailed(false);
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/integrations/${provider}/details`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body: Details) => {
        if (!cancelled) setDetails(body);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [provider, app.lastSyncAt, version]);

  const deleteData = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/integrations/${provider}/data`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't delete the synced data. Try again.");
      const r = body.removed ?? {};
      const n = (r.messages ?? 0) + (r.events ?? 0) + (r.files ?? 0) + (r.tasks ?? 0);
      setConfirming(false);
      onDataDeleted(`${n} synced item${n === 1 ? "" : "s"} deleted from STACK. ${app.name} stays connected.`);
      reload();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Couldn't delete the synced data. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (failed) return <p className="mt-5 text-xs text-neutral-500">Couldn&apos;t load this connection&apos;s details. <button onClick={reload} className="font-semibold text-ink underline">Try again</button></p>;
  if (!details) return <p className="mt-5 flex items-center gap-2 text-xs text-neutral-400"><Loader2 size={12} className="animate-spin" /> Loading connection details...</p>;

  return (
    <>
      <div className="mt-5">
        <Title>Connection</Title>
        <p className="mt-1 text-sm text-ink">
          {details.method === "token" ? "Connected with an access token you created" : `Signed in with ${app.name}`}
          {details.connectedAt && <span className="text-neutral-500"> - since {new Date(details.connectedAt).toLocaleDateString()}</span>}
        </p>
        {details.grantedScopes.length > 0 && (
          <details className="group mt-2">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-neutral-500 hover:text-ink">
              <ChevronDown size={12} className="transition-transform group-open:rotate-180" /> {details.grantedScopes.length} permission{details.grantedScopes.length === 1 ? "" : "s"} granted
            </summary>
            <ul className="mt-1.5 space-y-0.5 rounded-lg bg-neutral-50 p-2.5">
              {details.grantedScopes.map((s) => <li key={s} className="break-all font-mono text-[11px] text-neutral-600">{s}</li>)}
            </ul>
            <p className="mt-1 text-[11px] text-neutral-400">As granted by {app.name}. To change them, reconnect and approve again.</p>
          </details>
        )}
      </div>

      {details.jobs.length > 0 && (
        <div className="mt-5">
          <Title>Recent syncs</Title>
          <ul className="mt-2 space-y-1.5">
            {details.jobs.map((j, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {j.status === "Succeeded" ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green" /> : j.status === "Failed" ? <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red" /> : j.status === "Running" ? <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-blue" /> : <Clock size={14} className="mt-0.5 shrink-0 text-neutral-400" />}
                <span className="min-w-0">
                  <span className="text-ink">{REASON[j.reason] ?? j.reason}</span>
                  <span className="text-xs text-neutral-400"> - {relativeTime(j.finishedAt ?? j.createdAt)}{j.status === "Queued" && j.attempts > 0 ? `, retrying (attempt ${j.attempts + 1})` : j.status === "Queued" ? ", waiting" : ""}</span>
                  {j.lastError && j.status !== "Succeeded" && <span className="block text-xs text-neutral-500">{j.lastError}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {details.history.length > 0 && (
        <div className="mt-5">
          <Title>History</Title>
          <ul className="mt-2 space-y-1">
            {details.history.map((h, i) => (
              <li key={i} className="text-sm text-ink">
                {historyLabel(h)} <span className="text-xs text-neutral-400">- {new Date(h.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <Title>Your data</Title>
        <p className="mt-1 text-xs text-neutral-500">
          STACK keeps recent context, not an archive: mail from the last {details.retention.messageDays} days and up to {details.retention.maxFilesPerConnection.toLocaleString()} files. Only summaries
          are stored - never message bodies, attachments or file contents. Disconnecting deletes everything from {app.name}.
        </p>
        <button onClick={() => setConfirming(true)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-ink hover:border-red hover:text-red">
          <Trash2 size={13} /> Delete synced data
        </button>
      </div>

      {confirming && (
        <Modal label="Delete synced data" onClose={() => !deleting && setConfirming(false)}>
          <p className="text-base font-semibold text-ink">Delete what STACK synced from {app.name}?</p>
          <p className="mt-1 text-sm text-neutral-500">
            STACK deletes its copies of your {app.name} items. Nothing is deleted in {app.name} itself. The connection stays, and new activity will appear from the next sync onward
            {app.counts?.events ? " (upcoming calendar events come back on the next sync)" : ""}. To stop syncing completely, disconnect instead.
          </p>
          {deleteError && <p className="mt-3 rounded-lg bg-red-soft px-3 py-2 text-sm text-red">{deleteError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100" disabled={deleting} onClick={() => setConfirming(false)}>Cancel</button>
            <button className={cn("inline-flex items-center gap-1.5 rounded-lg bg-red px-4 py-2 text-sm font-semibold text-white", deleting && "opacity-60")} disabled={deleting} onClick={deleteData}>
              {deleting && <Loader2 size={14} className="animate-spin" />} Delete synced data
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
