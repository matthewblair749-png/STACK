"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { LAUNCH_MONTH, LAUNCH_SHORT } from "@/lib/launch";

const links = [
  { label: "How it works", href: "/#how" },
  { label: "Try it", href: "/#try" },
  { label: "Trust", href: "/#trust" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function LandingNav() {
  // Marketing pages keep the light brand design; the surface flag tells the theme to stay light while this nav is on screen.
  useEffect(() => {
    document.documentElement.dataset.surface = "marketing";
    return () => {
      delete document.documentElement.dataset.surface;
    };
  }, []);

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-3 z-50 px-3 sm:top-4 sm:px-4">
      <div className="mx-auto max-w-5xl">
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={cn(
            "clay-pill flex h-14 items-center justify-between bg-white/90 px-4 backdrop-blur-md transition-shadow sm:px-5",
            scrolled ? "shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)]" : "shadow-[0_4px_16px_-10px_rgba(0,0,0,0.15)]",
          )}
        >
          <Link href="/">
            <Logo size={24} />
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm font-medium text-neutral-700 transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <span className="btn-stack btn-sm pointer-events-none">Coming {LAUNCH_SHORT}</span>
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-full lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </motion.nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="mt-2 overflow-hidden rounded-3xl border border-neutral-200/80 bg-white/95 p-5 shadow-[0_20px_48px_-20px_rgba(0,0,0,0.3)] backdrop-blur-md lg:hidden"
            >
              <div className="flex flex-col gap-4">
                {links.map((l) => (
                  <Link key={l.label} href={l.href} className="text-sm font-medium text-neutral-700" onClick={() => setOpen(false)}>
                    {l.label}
                  </Link>
                ))}
                <p className="mt-2 rounded-full bg-[#fff6cc] px-4 py-2.5 text-center text-sm font-semibold text-ink">Coming {LAUNCH_MONTH}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
