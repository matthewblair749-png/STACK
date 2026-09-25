"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, SectionLabel } from "@/components/ui/card";

interface MemoryItem {
  id: string;
  key: string;
  value: Record<string, unknown>;
}

/** Everything STACK has noticed and remembered about the user's work. Fully visible, deletable. */
export function MemoryPanel() {
  const [items, setItems] = useState<MemoryItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/memory")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((b) => {
        if (!cancelled) setItems(b.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function forget(id: string) {
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
    fetch(`/api/memory/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <Card>
      <SectionLabel>What STACK knows</SectionLabel>
      <p className="mt-3 text-sm text-neutral-500">
        Facts STACK has noticed in the apps you connected, like people you hear from often. It only uses these to understand your work better. Delete any of them and STACK won&apos;t re-add it.
      </p>
      {items === null ? (
        <p className="mt-4 text-sm text-neutral-400">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-neutral-200 px-4 py-5 text-sm text-neutral-400">
          Nothing remembered yet. As you connect apps and sync, STACK will list what it learns here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-100">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{String(i.value.name ?? i.key)}</p>
                <p className="truncate text-xs text-neutral-400">
                  {i.key.startsWith("person:") ? `Person · ${String(i.value.email ?? "")} · ${String(i.value.recentMessages ?? 0)} recent messages` : i.key}
                </p>
              </div>
              <button onClick={() => forget(i.id)} className="shrink-0 text-neutral-300 hover:text-red" title="Forget this">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
