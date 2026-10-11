"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { relativeTime } from "@/components/app/home-parts";
import { useToast } from "@/components/app/toast";
import { providerLabel } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";

type Health = "connected" | "pending" | "needs_attention" | "expired";
interface Connection {
  provider: string;
  account: string | null;
  method: "oauth" | "token";
  health: Health;
  problem: string | null;
  connectedAt: string;
  lastSyncAt: string | null;
  scopes: string[];
}
interface MemberConnections {
  userId: string;
  name: string;
  email: string | null;
  role: "Owner" | "Admin" | "Member";
  isYou: boolean;
  canDisconnect: boolean;
  connections: Connection[];
}

const HEALTH: Record<Health, { label: string; className: string }> = {
  connected: { label: "Healthy", className: "bg-green-soft text-green" },
  pending: { label: "Waiting for first sync", className: "bg-blue-soft text-blue" },
  needs_attention: { label: "Needs attention", className: "bg-yellow-soft text-yellow-700" },
  expired: { label: "Needs reconnecting", className: "bg-red-soft text-red" },
};

/**
 * Owners and admins: which apps each teammate has connected, whether they're healthy, and the permissions
 * granted - never tokens or synced content. Apps can be disconnected here for offboarding; only the person
 * themselves can reconnect.
 */
export function TeamConnections() {
  const toast = useToast();
  const [members, setMembers] = useState<MemberConnections[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/workspace/connections")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Couldn't load the team's apps.");
        return body.members as MemberConnections[];
      })
      .then((m) => {
        if (!cancelled) {
          setMembers(m);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load the team's apps.");
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  async function disconnect(m: MemberConnections, c: Connection) {
    const key = `${m.userId}:${c.provider}`;
    setBusy(key);
    try {
      const res = await fetch(`/api/workspace/connections/${m.userId}/${c.provider}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't disconnect. Try again.");
      toast({
        title: `${providerLabel(c.provider)} disconnected for ${m.name}`,
        description: body.revoked ? "Access was revoked at the provider and their synced data from it deleted." : `${body.note ?? "STACK's stored access was deleted."} Their synced data from it was deleted.`,
      });
      setConfirming(null);
      setVersion((v) => v + 1);
    } catch (e) {
      toast({ title: "Couldn't disconnect", description: e instanceof Error ? e.message : undefined, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  const total = members?.reduce((n, m) => n + m.connections.length, 0) ?? 0;
  const attention = members?.reduce((n, m) => n + m.connections.filter((c) => c.health === "expired" || c.health === "needs_attention").length, 0) ?? 0;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-ink">Connected apps across the team</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Which apps each person has connected and whether they&apos;re working. Only owners and admins see this, and never anyone&apos;s synced content.
        {members && ` ${total} connection${total === 1 ? "" : "s"}${attention ? `, ${attention} need${attention === 1 ? "s" : ""} attention` : ""}.`}
      </p>
      {error && <p className="mt-3 text-sm text-red">{error}</p>}
      {!members && !error && <p className="mt-3 text-sm text-neutral-400">Loading...</p>}
      {members && (
        <div className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
          {members.map((m) => (
            <div key={m.userId} className="px-4 py-3">
              <p className="text-sm font-medium text-ink">
                {m.name}
                {m.isYou && <span className="text-neutral-400"> (you)</span>}
                <span className="ml-2 text-xs font-normal text-neutral-400">{m.role}</span>
              </p>
              {m.connections.length === 0 ? (
                <p className="mt-1 text-xs text-neutral-400">No apps connected.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {m.connections.map((c) => {
                    const key = `${m.userId}:${c.provider}`;
                    const h = HEALTH[c.health];
                    return (
                      <li key={c.provider} className="rounded-lg bg-neutral-50 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <IntegrationLogo app={c.provider} name={providerLabel(c.provider)} size="sm" />
                          <span className="text-sm text-ink">{providerLabel(c.provider)}</span>
                          {c.account && <span className="text-xs text-neutral-500">{c.account}</span>}
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", h.className)}>{h.label}</span>
                          <span className="text-xs text-neutral-400">{c.lastSyncAt ? `synced ${relativeTime(c.lastSyncAt)}` : "not synced yet"}</span>
                          {m.canDisconnect && confirming !== key && (
                            <button className="ml-auto text-xs text-neutral-500 hover:text-red" onClick={() => setConfirming(key)}>
                              Disconnect
                            </button>
                          )}
                        </div>
                        {c.problem && <p className="mt-1 text-xs text-neutral-500">{c.problem}</p>}
                        {c.scopes.length > 0 && (
                          <details className="group mt-1">
                            <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-neutral-500 hover:text-ink">
                              <ChevronDown size={11} className="transition-transform group-open:rotate-180" /> {c.scopes.length} permission{c.scopes.length === 1 ? "" : "s"} granted
                              {c.method === "token" ? " (personal access token)" : ""}
                            </summary>
                            <ul className="mt-1 space-y-0.5">
                              {c.scopes.map((s) => <li key={s} className="break-all font-mono text-[11px] text-neutral-500">{s}</li>)}
                            </ul>
                          </details>
                        )}
                        {confirming === key && (
                          <div className="mt-2 rounded-lg border border-red/20 bg-white p-2.5 text-xs">
                            <p className="text-ink">
                              Disconnect {m.name}&apos;s {providerLabel(c.provider)}? STACK revokes its access where {providerLabel(c.provider)} allows it and deletes everything it synced
                              from there for {m.name}. Nothing is deleted in {providerLabel(c.provider)} itself. Only {m.name} can reconnect it.
                            </p>
                            <div className="mt-2 flex gap-3">
                              <button className="rounded-lg bg-red px-3 py-1.5 font-medium text-white disabled:opacity-50" disabled={busy === key} onClick={() => disconnect(m, c)}>
                                {busy === key ? "Disconnecting..." : "Yes, disconnect"}
                              </button>
                              <button className="text-neutral-500 underline" onClick={() => setConfirming(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
