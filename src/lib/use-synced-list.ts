"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

interface Loaded<T> {
  key: string;
  items: T[];
  nextCursor: string | null;
  error: boolean;
}

/**
 * Cursor-paged list of what a user's connected apps have synced (messages / events / files).
 * `loading` is derived (results for a different query aren't "ready" yet) so filter changes never
 * flash stale rows, and more pages load lazily as the list is scrolled.
 */
export function useSyncedList<T>(kind: "messages" | "events" | "files", params: Record<string, string | undefined>) {
  const query = useMemo(() => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    return sp.toString();
  }, [params]);
  const key = `${kind}?${query}`;
  const [data, setData] = useState<Loaded<T> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/synced/${kind}${query ? `?${query}` : ""}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return setData({ key, items: [], nextCursor: null, error: true });
        const body: Page<T> = await res.json();
        setData({ key, items: body.items, nextCursor: body.nextCursor, error: false });
      })
      .catch(() => !cancelled && setData({ key, items: [], nextCursor: null, error: true }));
    return () => {
      cancelled = true;
    };
  }, [kind, query, key, reloadTick]);

  const current = data && data.key === key ? data : null;

  const loadMore = useCallback(async () => {
    if (!current?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/synced/${kind}?${query}${query ? "&" : ""}cursor=${encodeURIComponent(current.nextCursor)}`);
      if (res.ok) {
        const body: Page<T> = await res.json();
        setData((prev) => (prev && prev.key === key ? { ...prev, items: [...prev.items, ...body.items], nextCursor: body.nextCursor } : prev));
      }
    } finally {
      setLoadingMore(false);
    }
  }, [current?.nextCursor, key, kind, loadingMore, query]);

  return {
    items: current?.items ?? [],
    loading: current === null,
    error: current?.error ?? false,
    hasMore: !!current?.nextCursor,
    loadingMore,
    loadMore,
    reload: () => setReloadTick((t) => t + 1),
  };
}
