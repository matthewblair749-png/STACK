"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { useToast } from "@/components/app/toast";
import { providerLabel } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";
import { AppDrawer, AppTile, primaryAction, QueuePanel } from "./parts";
import { DisconnectDialog, FieldsDialog, Modal, PermissionSheet, SetupDialog, TokenDialog } from "./dialogs";
import { RevealDialog } from "./reveal";
import { QUEUE_KEY, type CatalogApp, type CatalogResponse, type QueueItem, type SyncOutcome } from "./types";

const REVEAL_SEEN = "stack-reveal-seen";

const readQueue = (): QueueItem[] => {
  try {
    return JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
};
const writeQueue = (items: QueueItem[]) => {
  try {
    if (items.length) sessionStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    else sessionStorage.removeItem(QUEUE_KEY);
  } catch {
    // Storage unavailable - the queue just won't survive the OAuth redirect.
  }
};

const describe = (o: SyncOutcome) =>
  [o.messages ? `${o.messages} messages` : null, o.events ? `${o.events} events` : null, o.files ? `${o.files} files` : null].filter(Boolean).join(", ") || "connected, nothing to import yet";

export function ConnectionCenter() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();

  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [perm, setPerm] = useState<{ app: CatalogApp; values?: Record<string, string> } | null>(null);
  const [fieldsApp, setFieldsApp] = useState<CatalogApp | null>(null);
  const [setupApp, setSetupApp] = useState<CatalogApp | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [tokenApp, setTokenApp] = useState<CatalogApp | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [disconnectApp, setDisconnectApp] = useState<CatalogApp | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [batchConfirm, setBatchConfirm] = useState(false);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [reveal, setReveal] = useState(false);
  const requestId = useRef(0);
  const handledReturn = useRef(false);
  const handledDeepLink = useRef(false);

  const fetchCatalog = useCallback(async (query: string): Promise<CatalogResponse | null> => {
    const id = ++requestId.current;
    const res = await fetch(`/api/apps${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (!res.ok) return null;
    const body = (await res.json()) as CatalogResponse;
    return id === requestId.current ? body : null;
  }, []);

  const reload = useCallback(async () => {
    const body = await fetchCatalog("");
    if (body) setData(body);
    return body;
  }, [fetchCatalog]);

  // Search (debounced) - the server understands what apps are for, not just their names.
  useEffect(() => {
    const t = window.setTimeout(() => {
      fetchCatalog(q.trim()).then((body) => {
        if (body) setData(body);
        setLoading(false);
      });
    }, q ? 200 : 0);
    return () => window.clearTimeout(t);
  }, [q, fetchCatalog]);

  const apps = useMemo(() => data?.apps ?? [], [data]);
  const bySlug = useMemo(() => new Map(apps.map((a) => [a.slug, a])), [apps]);
  const openApp = openSlug ? bySlug.get(openSlug) ?? null : null;
  const summary = data?.summary;
  const profession = data?.profession;

  const runSync = useCallback(
    async (providerIds: string[]): Promise<SyncOutcome[]> => {
      setSyncing((s) => new Set([...s, ...providerIds]));
      try {
        const res = await fetch("/api/integrations/sync", { method: "POST" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Sync failed.");
        return (body.perProvider ?? []) as SyncOutcome[];
      } finally {
        setSyncing((s) => {
          const next = new Set(s);
          providerIds.forEach((p) => next.delete(p));
          return next;
        });
      }
    },
    [],
  );

  /** Sends the browser to the provider's own authorization page. The only way a connection is ever created. */
  const goAuthorize = useCallback((app: CatalogApp, values?: Record<string, string>, remaining: QueueItem[] = []) => {
    const provider = app.oauthProviderId!;
    writeQueue([{ provider, name: providerLabel(provider), state: "connecting" }, ...remaining.filter((r) => r.provider !== provider)]);
    const url = new URL(`/api/integrations/${provider}/connect`, window.location.origin);
    for (const [k, v] of Object.entries(values ?? {})) url.searchParams.set(k, v);
    window.location.assign(url.toString());
  }, []);

  const beginConnect = useCallback(
    (app: CatalogApp) => {
      if (!app.supported || !app.oauthProviderId) return;
      if (!app.configured && app.tokenConnect) {
        setTokenError(null);
        setTokenApp(app);
        return;
      }
      if (!app.configured) {
        if (app.setup) {
          setSetupError(null);
          setSetupApp(app);
        } else toast({ title: `${app.name} isn't available yet`, description: app.missingSetup.join("; ") || "STACK can't connect to this app yet. We're working on it.", tone: "info" });
        return;
      }
      if (app.connectFields?.length) setFieldsApp(app);
      else setPerm({ app });
    },
    [toast],
  );

  const finishQueue = useCallback(
    (items: QueueItem[], latest: CatalogResponse | null) => {
      const anyDone = items.some((i) => i.state === "done");
      let seen = false;
      try {
        seen = localStorage.getItem(REVEAL_SEEN) === "1";
      } catch {
        // ignore
      }
      if (anyDone && !seen && latest) {
        setReveal(true);
        try {
          localStorage.setItem(REVEAL_SEEN, "1");
        } catch {
          // ignore
        }
      }
    },
    [],
  );

  // Coming back from a provider: verify, sync for real, report exactly what happened, then carry on with the queue.
  useEffect(() => {
    if (handledReturn.current) return;
    handledReturn.current = true;
    const connected = params.get("connected");
    const error = params.get("error");
    if (!connected && !error) {
      writeQueue([]); // A plain visit: any leftover queue from an abandoned flow is stale.
      return;
    }
    router.replace("/integrations");
    let items = readQueue();

    (async () => {
      if (error) {
        items = items.map((i) => (i.state === "connecting" ? { ...i, state: "failed" as const, detail: error } : i));
        toast({ title: "Connection failed", description: error, tone: "error" });
        setQueue(items);
        writeQueue(items);
        return;
      }
      const provider = connected!;
      if (!items.some((i) => i.provider === provider)) items = [{ provider, name: providerLabel(provider), state: "connecting" }, ...items];
      items = items.map((i) => (i.provider === provider ? { ...i, state: "syncing" as const, detail: "Authorized. Syncing your data..." } : i));
      setQueue(items);
      writeQueue(items);

      let outcome: SyncOutcome | undefined;
      try {
        outcome = (await runSync([provider])).find((o) => o.provider === provider);
      } catch (e) {
        outcome = { provider, error: e instanceof Error ? e.message : "Sync failed." };
      }
      items = items.map((i) =>
        i.provider === provider ? (outcome?.error ? { ...i, state: "failed" as const, detail: outcome.error } : { ...i, state: "done" as const, detail: `Connected - ${describe(outcome ?? { provider })}` }) : i,
      );
      setQueue(items);
      writeQueue(items);
      const latest = await reload();

      const next = items.find((i) => i.state === "waiting");
      if (next) {
        const target = latest?.apps.find((a) => a.oauthProviderId === next.provider && a.supported);
        if (target) {
          const rest = items.filter((i) => i.provider !== next.provider && i.state === "waiting");
          if (pausedRef.current) return;
          items = items.map((i) => (i.provider === next.provider ? { ...i, state: "connecting" as const } : i));
          setQueue(items);
          writeQueue(items);
          window.setTimeout(() => {
            if (pausedRef.current) {
              const back = items.map((i) => (i.provider === next.provider ? { ...i, state: "waiting" as const } : i));
              setQueue(back);
              writeQueue(back);
              return;
            }
            goAuthorize(target, undefined, rest);
          }, 1500);
          return;
        }
      }
      finishQueue(items, latest);
    })();
  }, [params, router, toast, runSync, reload, goAuthorize, finishQueue]);

  // Deep link from Home or the AI: /integrations?connect=<app> goes straight to that app's connect flow.
  useEffect(() => {
    const wanted = params.get("connect");
    if (!wanted || handledDeepLink.current || params.get("connected") || params.get("error")) return;
    const app = apps.find((a) => a.slug === wanted);
    if (!app) return;
    handledDeepLink.current = true;
    router.replace("/integrations");
    // Opened on the next tick: the flow shows dialogs, which is React state, not something to set during the effect itself.
    queueMicrotask(() => {
      if (!app.connected) beginConnect(app);
      else setOpenSlug(app.slug);
    });
  }, [apps, params, router, beginConnect]);

  const connectAll = () => {
    const seen = new Set<string>();
    const targets = apps.filter((a) => a.recommended && a.supported && a.configured && !a.connected && !a.connectFields?.length && a.oauthProviderId && !seen.has(a.oauthProviderId) && (seen.add(a.oauthProviderId), true));
    if (!targets.length) return;
    const items: QueueItem[] = targets.map((a) => ({ provider: a.oauthProviderId!, name: a.name, state: "waiting" as const }));
    setBatchConfirm(false);
    setQueue(items.map((i, idx) => (idx === 0 ? { ...i, state: "connecting" as const } : i)));
    goAuthorize(targets[0], undefined, items.slice(1));
  };

  /** Continue a paused queue with its next waiting app (each still needs its own approval). */
  const resumeQueue = () => {
    pausedRef.current = false;
    setPaused(false);
    const items = readQueue();
    const next = items.find((i) => i.state === "waiting");
    const target = next && apps.find((a) => a.oauthProviderId === next.provider && a.supported);
    if (next && target) goAuthorize(target, undefined, items.filter((i) => i.provider !== next.provider && i.state === "waiting"));
  };

  const saveSetup = async (app: CatalogApp, values: Record<string, string>) => {
    setSetupBusy(true);
    setSetupError(null);
    try {
      const res = await fetch(`/api/integrations/${app.oauthProviderId}/setup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSetupError(body.error ?? "Couldn't save the credentials.");
        return;
      }
      setSetupApp(null);
      const latest = await reload();
      const fresh = latest?.apps.find((a) => a.slug === app.slug);
      if (fresh?.configured) beginConnect(fresh);
    } finally {
      setSetupBusy(false);
    }
  };

  /** Saves a token the user pasted (after it is checked against the app), then syncs for real and reports the result. */
  const connectWithToken = async (app: CatalogApp, token: string, fields: Record<string, string>) => {
    const provider = app.oauthProviderId!;
    setTokenBusy(true);
    setTokenError(null);
    try {
      const res = await fetch(`/api/integrations/${provider}/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, fields }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTokenError(body.error ?? "Couldn't connect. Try again.");
        return;
      }
      setTokenApp(null);
      toast({ title: `${app.name} connected`, description: body.account ? `Connected as ${body.account}. Syncing...` : "Syncing..." });
      const outcome = (await runSync([provider])).find((o) => o.provider === provider);
      if (outcome?.error) toast({ title: `${app.name} couldn't sync`, description: outcome.error, tone: "error" });
      else toast({ title: `${app.name} synced`, description: describe(outcome ?? { provider }) });
      await reload();
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : "Couldn't connect. Try again.");
    } finally {
      setTokenBusy(false);
    }
  };

  const syncOne = async (app: CatalogApp) => {
    const provider = app.oauthProviderId!;
    try {
      const outcome = (await runSync([provider])).find((o) => o.provider === provider);
      if (outcome?.error) toast({ title: `${app.name} couldn't sync`, description: outcome.error, tone: "error" });
      else toast({ title: `${app.name} synced`, description: describe(outcome ?? { provider }) });
    } catch (e) {
      toast({ title: "Couldn't sync", description: e instanceof Error ? e.message : "Try again.", tone: "error" });
    }
    await reload();
  };

  const disconnect = async (app: CatalogApp) => {
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/integrations/${app.oauthProviderId}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't disconnect.");
      toast({ title: `${providerLabel(app.oauthProviderId!)} disconnected`, description: body.revoked ? "Access was revoked at the provider and imported content removed." : (body.note ?? "Stored access and imported content removed.") });
      setDisconnectApp(null);
      setOpenSlug(null);
      await reload();
    } catch (e) {
      toast({ title: "Couldn't disconnect", description: e instanceof Error ? e.message : "Try again.", tone: "error" });
    } finally {
      setDisconnecting(false);
    }
  };

  const onTileAction = (app: CatalogApp) => {
    const a = primaryAction(app);
    if (a.kind === "manage") setOpenSlug(app.slug);
    else if (a.kind !== "none") beginConnect(app);
  };
  const isSyncing = (a: CatalogApp) => !!a.oauthProviderId && syncing.has(a.oauthProviderId);

  const connectable = apps.filter((a) => a.recommended && a.supported && a.configured && !a.connected && !a.connectFields?.length);
  const batchTargets = [...new Map(connectable.filter((a) => a.oauthProviderId).map((a) => [a.oauthProviderId!, a])).values()];
  const recommended = apps.filter((a) => a.recommended && a.supported && !a.connected);
  const connectedApps = apps.filter((a) => a.connected);
  const categories = useMemo(() => [...new Set(apps.map((a) => a.category))].sort(), [apps]);
  const nextBest = recommended.find((a) => a.meta?.unlocks.length) ?? apps.find((a) => a.supported && !a.connected && a.isUniversal && a.meta);
  const searching = q.trim().length > 0;

  const grid = (list: CatalogApp[], reason?: string) => (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((a) => (
        <AppTile key={a.slug} app={a} syncing={isSyncing(a)} reason={reason} onOpen={() => setOpenSlug(a.slug)} onAction={() => onTileAction(a)} />
      ))}
    </div>
  );
  const heading = (t: string, extra?: React.ReactNode) => (
    <div className="mt-8 flex items-center justify-between">
      <p className="text-sm font-semibold text-ink">{t}</p>
      {extra}
    </div>
  );

  const groupByCategory = (list: CatalogApp[]) => {
    const m = new Map<string, CatalogApp[]>();
    for (const a of list) m.set(a.category, [...(m.get(a.category) ?? []), a]);
    return [...m.entries()].sort(([x], [y]) => x.localeCompare(y));
  };

  const stat = (label: string, value: number | undefined, tone?: string) => (
    <div className="rounded-2xl border border-neutral-100 bg-white px-4 py-3">
      <p className={cn("text-2xl font-semibold", tone ?? "text-ink")}>{value ?? "-"}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Your work, connected.</h1>
      <p className="mt-1 text-sm text-neutral-500">Connect the apps where your work happens. STACK brings the important context together - and only ever reads what you authorize.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Connected", summary?.connected)}
        {stat("Needs attention", summary?.needsAttention, summary?.needsAttention ? "text-red" : undefined)}
        {stat("Ready to connect", summary?.available)}
        {stat("Coming soon", summary?.comingSoon, "text-neutral-400")}
      </div>

      {queue.length > 0 && (
        <QueuePanel
          items={queue}
          paused={paused}
          onPause={() => {
            pausedRef.current = true;
            setPaused(true);
          }}
          onResume={resumeQueue}
          onDismiss={() => {
            setQueue([]);
            writeQueue([]);
          }}
        />
      )}

      {summary && summary.connected === 0 && queue.length === 0 && !searching && (
        <div className="mt-6 rounded-2xl border border-neutral-100 bg-white p-6 text-center">
          <p className="text-base font-semibold text-ink">STACK works best when it can see your work.</p>
          <p className="mt-1 text-sm text-neutral-500">Connect your first app to start understanding your workspace.</p>
        </div>
      )}

      {summary && summary.connected > 0 && nextBest && !searching && queue.length === 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-soft px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-ink">
            <Sparkles size={15} className="text-blue" />
            <span><span className="font-semibold">Add {nextBest.name}</span> to also: {nextBest.meta?.unlocks.slice(0, 2).join(", ").toLowerCase()}.</span>
          </p>
          <button onClick={() => onTileAction(nextBest)} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white">{primaryAction(nextBest).label}</button>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5">
        <Search size={15} className="text-neutral-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps - try “email”, “accounting” or “pharmacy”" className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400" aria-label="Search apps" />
      </div>

      {!searching && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {["all", "connected", ...(recommended.length ? ["recommended"] : []), ...categories].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium capitalize", filter === f ? "border-ink bg-ink text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-300")}>
              {f}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="mt-8 text-sm text-neutral-400">Loading your apps...</p>}

      {!loading && searching && (
        <>
          {heading(`${apps.length} result${apps.length === 1 ? "" : "s"} for “${q.trim()}”`)}
          {apps.length ? grid(apps) : <p className="mt-3 text-sm text-neutral-500">No apps match. Try a broader word like “email”, “files”, “crm” or “design”.</p>}
        </>
      )}

      {!loading && !searching && filter === "all" && (
        <>
          {connectedApps.length > 0 && (<>{heading("Connected")}{grid(connectedApps)}</>)}
          {recommended.length > 0 && (
            <>
              {heading(profession ? `Recommended for ${profession.name}` : "Recommended for you", batchTargets.length >= 2 ? <button onClick={() => setBatchConfirm(true)} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white">Connect all recommended ({batchTargets.length})</button> : undefined)}
              {grid(recommended, profession ? `Recommended because you selected ${profession.name}` : undefined)}
            </>
          )}
          {groupByCategory(apps.filter((a) => a.supported && !a.connected && !a.recommended)).map(([cat, list]) => (
            <div key={cat}>{heading(cat)}{grid(list)}</div>
          ))}
          {apps.some((a) => !a.supported) && (
            <details className="mt-10 rounded-2xl border border-neutral-100 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-ink">Coming soon ({apps.filter((a) => !a.supported).length})</summary>
              <p className="mt-1 text-xs text-neutral-500">Real apps STACK can&apos;t connect to yet. They&apos;re listed so you know what&apos;s planned - none pretend to connect.</p>
              {groupByCategory(apps.filter((a) => !a.supported)).map(([cat, list]) => (<div key={cat}>{heading(cat)}{grid(list)}</div>))}
            </details>
          )}
        </>
      )}

      {!loading && !searching && filter !== "all" && (
        <>
          {grid(
            filter === "connected" ? connectedApps : filter === "recommended" ? recommended : apps.filter((a) => a.category === filter),
            filter === "recommended" && profession ? `Recommended because you selected ${profession.name}` : undefined,
          )}
          {filter === "connected" && connectedApps.length === 0 && <p className="mt-3 text-sm text-neutral-500">Nothing connected yet.</p>}
        </>
      )}

      {openApp && (
        <AppDrawer
          app={openApp}
          syncing={isSyncing(openApp)}
          siblings={apps.filter((a) => a.oauthProviderId === openApp.oauthProviderId && a.slug !== openApp.slug).map((a) => a.name)}
          onClose={() => setOpenSlug(null)}
          onAction={() => beginConnect(openApp)}
          onSync={() => syncOne(openApp)}
          onDisconnect={() => setDisconnectApp(openApp)}
        />
      )}

      {perm && (
        <PermissionSheet
          app={perm.app}
          onCancel={() => setPerm(null)}
          onContinue={() => {
            const target = perm;
            setPerm(null);
            goAuthorize(target.app, target.values);
          }}
          onUseToken={
            perm.app.tokenConnect
              ? () => {
                  const target = perm.app;
                  setPerm(null);
                  setTokenError(null);
                  setTokenApp(target);
                }
              : undefined
          }
        />
      )}
      {fieldsApp && (
        <FieldsDialog
          app={fieldsApp}
          onCancel={() => setFieldsApp(null)}
          onSubmit={(values) => {
            setPerm({ app: fieldsApp, values });
            setFieldsApp(null);
          }}
        />
      )}
      {setupApp?.setup && <SetupDialog app={setupApp} busy={setupBusy} error={setupError} onCancel={() => setSetupApp(null)} onSave={(values) => saveSetup(setupApp, values)} />}
      {tokenApp?.tokenConnect && <TokenDialog app={tokenApp} busy={tokenBusy} error={tokenError} onCancel={() => setTokenApp(null)} onSubmit={(t, f) => connectWithToken(tokenApp, t, f)} />}
      {disconnectApp && <DisconnectDialog app={disconnectApp} busy={disconnecting} onCancel={() => setDisconnectApp(null)} onConfirm={() => disconnect(disconnectApp)} />}

      {batchConfirm && (
        <Modal label="Connect all recommended" onClose={() => setBatchConfirm(false)}>
          <p className="text-base font-semibold text-ink">Connect {batchTargets.length} recommended apps</p>
          <p className="mt-1 text-sm text-neutral-500">You&apos;ll approve each one on its own page, one after another. STACK only asks to read:</p>
          <ul className="mt-3 space-y-2">
            {batchTargets.map((a) => (
              <li key={a.slug} className="text-sm"><span className="font-medium text-ink">{providerLabel(a.oauthProviderId!)}</span> <span className="text-neutral-500">- {a.meta?.read.join(", ").toLowerCase()}</span></li>
            ))}
          </ul>
          {recommended.length > batchTargets.length && <p className="mt-3 text-xs text-neutral-500">{recommended.length - batchTargets.length} other recommended app(s) need a one-time setup or extra details first, so they&apos;re not included.</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100" onClick={() => setBatchConfirm(false)}>Cancel</button>
            <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={connectAll}>Start connecting</button>
          </div>
        </Modal>
      )}

      {reveal && <RevealDialog apps={apps} onClose={() => setReveal(false)} />}
    </div>
  );
}
