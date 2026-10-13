"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { DataGroupId } from "./data-groups";

/** What needs the person right now, from /api/attention. Shared by the sidebar, the mobile tab bar and the Inbox. */
export interface Attention {
  inbox: number;
  work: number;
  groups: { id: DataGroupId; count: number }[];
}

const REFRESH_MS = 2 * 60 * 1000;
const STALE_MS = 30 * 1000;

let current: Attention | null = null;
let inflight: Promise<void> | null = null;
let lastFetch = 0;
let users = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function endOfToday(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Fetches fresh counts (one request at a time, however many components ask). */
export function refreshAttention(): Promise<void> {
  if (inflight) return inflight;
  inflight = fetch(`/api/attention?dayEnd=${encodeURIComponent(endOfToday())}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((body: Attention | null) => {
      if (!body) return;
      current = body;
      listeners.forEach((l) => l());
    })
    .catch(() => {
      // Counts are a convenience; the pages work without them.
    })
    .finally(() => {
      inflight = null;
      lastFetch = Date.now();
    });
  return inflight;
}

function refreshIfStale() {
  if (Date.now() - lastFetch > STALE_MS) void refreshAttention();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAttention(): Attention | null {
  const value = useSyncExternalStore(subscribe, () => current, () => null);
  useEffect(() => {
    // One timer and one focus listener for the whole page, however many components use the counts.
    if (users++ === 0) {
      timer = window.setInterval(refreshAttention, REFRESH_MS);
      window.addEventListener("focus", refreshIfStale);
    }
    refreshIfStale();
    return () => {
      if (--users === 0) {
        window.clearInterval(timer);
        window.removeEventListener("focus", refreshIfStale);
      }
    };
  }, []);
  return value;
}

/** A count as a badge label: nothing for zero, "99+" past 99. */
export function badgeLabel(n: number | undefined): string | undefined {
  if (!n) return undefined;
  return n > 99 ? "99+" : String(n);
}
