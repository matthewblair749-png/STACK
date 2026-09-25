"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProviderSyncResult {
  provider: string;
  messages?: number;
  events?: number;
  files?: number;
  error?: string;
}

export function SyncNowButton({ onSynced }: { onSynced?: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setSummary(null);
    try {
      const res = await fetch("/api/integrations/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setSummary(body.error || "Sync failed.");
        return;
      }
      const results: ProviderSyncResult[] = body.perProvider ?? [];
      if (results.length === 0) {
        setSummary("No connected apps to sync yet.");
      } else {
        const parts = results.map((r) =>
          r.error
            ? `${r.provider}: ${r.error}`
            : `${r.provider}: ${[r.messages && `${r.messages} messages`, r.events && `${r.events} events`, r.files && `${r.files} files`].filter(Boolean).join(", ") || "up to date"}`
        );
        setSummary(parts.join(" · "));
      }
      onSynced?.();
    } catch {
      setSummary("Couldn't reach STACK. Try again.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
        <RefreshCw size={13} className={syncing ? "animate-spin" : undefined} />
        {syncing ? "Syncing..." : "Sync now"}
      </Button>
      {summary && <p className="max-w-xs text-right text-xs text-neutral-400">{summary}</p>}
    </div>
  );
}
