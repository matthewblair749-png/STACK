"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { IntegrationLogo } from "@/components/brand-icons";

const QUICK_PROVIDERS = [
  { id: "google", name: "Google", detail: "Gmail, Calendar, Drive" },
  { id: "microsoft", name: "Microsoft", detail: "Outlook, Calendar, OneDrive" },
  { id: "slack", name: "Slack", detail: "Channels and DMs" },
];

interface AppRow {
  oauthProviderId: string | null;
  configured: boolean;
  connected: boolean;
}

export function QuickStart({ onBuild, onCustomize }: { onBuild: () => void; onCustomize: () => void }) {
  const [apps, setApps] = useState<AppRow[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(() => {
    return fetch("/api/apps")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body) setApps(body.apps ?? []);
      })
      .catch(() => {
        // Keep whatever we last knew; the next poll will retry.
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/apps")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body) setApps(body.apps ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const id = window.setInterval(load, 3000);
    return () => window.clearInterval(id);
  }, [pending, load]);

  const state = QUICK_PROVIDERS.map((p) => {
    const rows = (apps ?? []).filter((a) => a.oauthProviderId === p.id);
    return { ...p, connected: rows.some((r) => r.connected), configured: rows.some((r) => r.configured) };
  });
  const anyConnected = state.some((s) => s.connected);

  function connect(providerId: string) {
    setPending(providerId);
    window.location.assign(new URL(`/api/integrations/${providerId}/connect?returnTo=/onboarding`, window.location.origin).toString());
  }

  return (
    <div className="flex flex-col items-center text-center">
      <LogoMark size={44} />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">Let&apos;s build your day.</h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        Connect the tools you use most and STACK will work out what needs you first. You choose what it can read, and you can disconnect anytime.
      </p>

      <div className="mt-8 w-full max-w-md space-y-2.5 text-left">
        {state.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50">
              <IntegrationLogo app={s.id} name={s.name} size="md" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{s.name}</p>
              <p className="truncate text-xs text-neutral-400">{s.detail}</p>
            </div>
            <Button
              size="sm"
              variant={s.connected ? "outline" : "primary"}
              disabled={apps === null || s.connected || !s.configured || pending === s.id}
              title={!s.configured && apps !== null ? "This connection isn't set up on this STACK yet" : undefined}
              onClick={() => connect(s.id)}
              className="shrink-0"
            >
              {s.connected ? (
                <>
                  <Check size={13} /> Connected
                </>
              ) : pending === s.id ? (
                <Loader2 size={13} className="animate-spin" />
              ) : apps !== null && !s.configured ? (
                "Not set up yet"
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        ))}
      </div>

      <Button className="mt-8" disabled={!anyConnected} onClick={onBuild}>
        Build my day <ArrowRight size={15} />
      </Button>
      {!anyConnected && <p className="mt-2 text-xs text-neutral-400">Connect at least one app to continue.</p>}

      <button onClick={onCustomize} className="mt-5 text-sm font-medium text-neutral-400 hover:text-ink">
        Set up more apps manually
      </button>
      <p className="mt-4 text-sm text-neutral-400">
        Already have an account? <Link href="/login" className="font-medium text-ink underline">Sign in</Link>
      </p>
    </div>
  );
}
