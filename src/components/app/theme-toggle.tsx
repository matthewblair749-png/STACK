"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { setThemePref, useTheme, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** One-tap switch for the top bar: flips between light and dark. */
export function ThemeToggle() {
  const { resolved } = useTheme();
  const next: ThemePref = resolved === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => setThemePref(next)}
      aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={resolved === "dark" ? "Light mode" : "Dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-ink"
    >
      {resolved === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Full choice for Settings: Light, Dark, or follow the device. */
export function ThemePicker() {
  const { pref } = useTheme();
  return (
    <div role="radiogroup" aria-label="Appearance" className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={pref === value}
          onClick={() => setThemePref(value)}
          className={cn("flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors", pref === value ? "bg-white text-ink shadow-sm" : "text-neutral-500 hover:text-ink")}
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );
}
