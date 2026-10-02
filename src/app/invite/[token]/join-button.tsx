"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function JoinButton({ token, label }: { token: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't join. Try again.");
      try {
        sessionStorage.clear();
      } catch {
        // Nothing cached to clear.
      }
      // A full load so every part of the app picks up the newly active workspace.
      window.location.assign(new URL("/home", window.location.origin).toString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <Button className="w-full" onClick={join} disabled={busy}>
        {busy && <Loader2 size={14} className="animate-spin" />} {label}
      </Button>
      {error && <p role="alert" className="mt-3 text-center text-sm text-red">{error}</p>}
    </>
  );
}
