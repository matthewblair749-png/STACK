"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";

const KEY = "stack-theme";
const EVENT = "stack-theme-change";

const systemDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

const resolve = (pref: ThemePref): "light" | "dark" => (pref === "system" ? (systemDark() ? "dark" : "light") : pref);

function apply(pref: ThemePref) {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    root.classList.add("theme-fade");
    window.setTimeout(() => root.classList.remove("theme-fade"), 300);
  }
  root.dataset.theme = resolve(pref);
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
  apply(pref);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (readPref() === "system") {
      apply("system");
      onChange();
    }
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  mq.addEventListener("change", onSystem);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
    mq.removeEventListener("change", onSystem);
  };
}

/** "pref:resolved", e.g. "system:dark". A string so React can compare snapshots cheaply. */
const snapshot = () => `${readPref()}:${resolve(readPref())}`;

export function useTheme(): { pref: ThemePref; resolved: "light" | "dark" } {
  const s = useSyncExternalStore(subscribe, snapshot, () => "system:light");
  const [pref, resolved] = s.split(":") as [ThemePref, "light" | "dark"];
  return { pref, resolved };
}
