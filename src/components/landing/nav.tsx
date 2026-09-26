"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { label: "Product", href: "/#product" },
  { label: "Solutions", href: "/#solutions" },
  { label: "Integrations", href: "/#integrations" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/#resources" },
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
            "flex h-14 items-center justify-between rounded-full border border-neutral-200/80 bg-white/90 px-4 backdrop-blur-md transition-shadow sm:px-5",
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
            <Link href="/login" className="text-sm font-medium text-neutral-700 hover:text-ink">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started →</Button>
            </Link>
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
                <div className="mt-2 flex flex-col gap-2">
                  <Link href="/login"><Button variant="outline" size="md" className="w-full">Log in</Button></Link>
                  <Link href="/signup"><Button size="md" className="w-full">Get started →</Button></Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
