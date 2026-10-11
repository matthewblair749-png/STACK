"use client";

import { useState } from "react";
import { AlertCircle, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeAction } from "@/server/actions/types";

export interface PendingActionData {
  id: string;
  kind: "CreateTask" | "SendEmail" | "SendSlackMessage" | "UpdateProjectStatus" | "UpdateTask" | "CreateCalendarEvent";
  payload: Record<string, unknown>;
}

type Outcome =
  | { state: "approved" }
  | { state: "rejected" }
  /** Definitely didn't happen - can be edited and approved again. */
  | { state: "failed"; message: string }
  /** Might have happened (no confirmation from the app) - final, so it can't be blindly repeated. */
  | { state: "unconfirmed"; message: string }
  /** An identical action was approved moments ago - doing it again needs an explicit yes. */
  | { state: "duplicate"; message: string }
  | null;

const UNCONFIRMED = "STACK started this but didn't get confirmation that it finished. Check the app before trying again.";

/**
 * "STACK wants to..." - the approval gate for every write action. Nothing here executes until the
 * user presses Approve; the result shown is whatever the server actually reported, never assumed.
 */
export function ActionCard({ action, status, onResolved }: { action: PendingActionData; /** Current server status when re-showing an old proposal (e.g. a reloaded conversation). */ status?: string; onResolved?: (state: "approved" | "rejected" | "failed") => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(action.payload, null, 2));
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(() =>
    status === "Executed" ? { state: "approved" } : status === "Rejected" ? { state: "rejected" } : status === "Approved" || status === "Failed" ? { state: "unconfirmed", message: UNCONFIRMED } : null,
  );
  const [parseError, setParseError] = useState(false);

  async function approve(confirmDuplicate = false) {
    let payload: Record<string, unknown> | undefined;
    if (editing) {
      try {
        payload = JSON.parse(draft);
        setParseError(false);
      } catch {
        setParseError(true);
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/actions/${action.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(payload ? { payload } : {}), ...(confirmDuplicate ? { confirmDuplicate: true } : {}) }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setOutcome({ state: "approved" });
        onResolved?.("approved");
      } else if (body.needsConfirmation) {
        setOutcome({ state: "duplicate", message: body.error });
      } else if (body.uncertain) {
        setOutcome({ state: "unconfirmed", message: body.action?.errorMessage || UNCONFIRMED });
        onResolved?.("failed");
      } else {
        setOutcome({ state: "failed", message: body.action?.errorMessage || body.error || "Something went wrong. Nothing was changed." });
        onResolved?.("failed");
      }
    } catch {
      // The request may or may not have reached STACK.
      setOutcome({ state: "unconfirmed", message: "Couldn't hear back from STACK. Reload to see whether this went through before trying again." });
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    try {
      await fetch(`/api/actions/${action.id}/reject`, { method: "POST" });
    } finally {
      setBusy(false);
      setOutcome({ state: "rejected" });
      onResolved?.("rejected");
    }
  }

  if (outcome?.state === "approved") {
    return (
      <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-green/30 bg-green-soft px-3 py-2 text-xs text-green">
        <Check size={13} /> Approved and done: {describeAction(action.kind, action.payload)}
      </div>
    );
  }
  if (outcome?.state === "unconfirmed") {
    return (
      <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-yellow/40 bg-yellow-soft px-3 py-2 text-xs text-yellow-700">
        <AlertCircle size={13} className="mt-0.5 shrink-0" />
        <span>
          <span className="font-semibold">Not confirmed:</span> {describeAction(action.kind, action.payload)}. {outcome.message}
        </span>
      </div>
    );
  }
  if (outcome?.state === "rejected") {
    return <div className="mt-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500">Cancelled. Nothing was changed.</div>;
  }

  return (
    <div className="mt-2.5 rounded-xl border border-blue/20 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue">STACK wants to</p>
      <p className="mt-1 text-sm text-ink">{describeAction(action.kind, action.payload)}</p>
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="mt-2 w-full rounded-lg border border-neutral-200 p-2 font-mono text-xs"
          />
          {parseError && <p className="mt-1 text-xs text-red">That isn&apos;t valid JSON.</p>}
        </>
      ) : (
        <dl className="mt-1.5 space-y-0.5 text-xs text-neutral-500">
          {Object.entries(action.payload).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-20 shrink-0 text-neutral-400">{k}</dt>
              <dd className="min-w-0 break-words">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {outcome?.state === "failed" && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-soft px-2.5 py-2 text-xs text-red">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> {outcome.message}
        </p>
      )}
      {outcome?.state === "duplicate" ? (
        <div className="mt-2 rounded-lg bg-yellow-soft px-2.5 py-2 text-xs text-yellow-700">
          <p>{outcome.message}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => approve(true)} disabled={busy}>
              Yes, do it again
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOutcome(null)} disabled={busy}>
              Not now
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-2">
          <Button size="sm" onClick={() => approve()} disabled={busy}>
            <Check size={13} /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)} disabled={busy}>
            <Pencil size={13} /> Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={reject} disabled={busy}>
            <X size={13} /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
