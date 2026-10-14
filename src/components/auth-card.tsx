"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";
import { DeskSurface, PaperSheet } from "@/components/desk-surface";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <DeskSurface>
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center text-center">
            <Link href="/"><Logo size={28} /></Link>
            <h1 className="mt-7 text-balance text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-ink">{title}</h1>
            <p className="mt-2 text-[15px] text-neutral-500">{subtitle}</p>
          </div>

          <div className="mt-14">
            <PaperSheet tab="STACK" className="p-6">{children}</PaperSheet>
          </div>

          {footer && <p className="mt-7 text-center text-sm text-neutral-500">{footer}</p>}
        </motion.div>
      </div>
    </DeskSurface>
  );
}
